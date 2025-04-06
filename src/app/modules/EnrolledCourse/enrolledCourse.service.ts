import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import { OfferedCourse } from '../OfferedCourse/OfferedCourse.model';
import { Student } from '../student/student.model';
import { TEnrolledCourse } from './EnrolledCourse.interface';
import EnrolledCourse from './enrolledCourse.model';
import { SemesterRegistration } from '../semseterRegistration/semseterRegistration.model';
import { Course } from '../Course/course.model';
import { Faculty } from '../faculty/faculty.model';
import { calculateGradeAndPoints } from './enrolledCourse.utils';

const createEnrolledCourseIntoDB = async (
  userId: string,
  payload: TEnrolledCourse,
) => {
  /*
     *Step 1 -> User will be validated by auth
      Step 2 -> Check if the offered course exist ,
      step 3 -> Check if the student is already enrolled , 
      step 4 -> Check if the max credit is exceeded
      step 4 -> create an enrollment if validation successful  
     */

  const { offeredCourse } = payload; //payload theke astese OfferedCourse er id
  const isOfferedCourseExists = await OfferedCourse.findById(offeredCourse);

  if (!isOfferedCourseExists) {
    throw new AppError(404, 'Offered course not found');
  }

  //kokon enroll korte parbo jkn max capacity greater than 0 hobe
  if (isOfferedCourseExists.maxCapacity <= 0) {
    throw new AppError(409, 'Room is full');
  }

  const student = await Student.findOne({ id: userId }, { id: 1 });
  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  //duibar enroll hoise naki check koro This line is using findOne() to query the EnrolledCourse collection for a document that matches three criteria:
  const isStudentAlreadyEnrolled = await EnrolledCourse.findOne({
    semesterRegistration: isOfferedCourseExists?.semesterRegistration,
    offeredCourse,
    student: student?._id,
  });

  if (isStudentAlreadyEnrolled) {
    throw new AppError(401, 'Student is already enrolled');
  }

  //check total credits exceeds maxCredit
  //course
  //Total entrolled credits  + new enrolled course credit  > maxCredit  //aggregation
  const course = await Course.findById(isOfferedCourseExists.course);
  const currentCredit = course?.credits;

  const semesterRegistration = await SemesterRegistration.findById(
    isOfferedCourseExists.semesterRegistration,
  ).select('maxCredit');

  const maxCredit = semesterRegistration?.maxCredit;
  const enrolledCourses = await EnrolledCourse.aggregate([
    {
      $match: {
        semesterRegistration: isOfferedCourseExists.semesterRegistration,
        student: student._id,
      },
    },
    {
      $lookup: {
        from: 'courses', //database collection name
        localField: 'course',
        foreignField: '_id', //kon field ta chacco
        as: 'enrolledCourseData', //field er naam ki hobe
      },
    },
    {
      // The $unwind operator in MongoDB is used to deconstruct an array field into multiple document , //refer korba kon field k seita boshaba
      $unwind: '$enrolledCourseData',
    },
    {
      $group: {
        _id: null,
        totalEnrolledCredits: { $sum: '$enrolledCourseData.credits' },
      }, //null dile shob merge hoie jabe
    },
    {
      $project: {
        _id: 0,
        totalEnrolledCredits: 1,
      },
    },
  ]);

  const totalCredits =
    enrolledCourses.length > 0 ? enrolledCourses[0]?.totalEnrolledCredits : 0;

  //   console.log(enrolledCourses);
  //   console.log(totalCredits);

  if (totalCredits && maxCredit && totalCredits + currentCredit > maxCredit) {
    throw new AppError(409, 'You havea exceeded maximum number of credits');
  }

  //isolated enviroment - dui jaigai write operation hobe tai transaction and rollback
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    //transaction and rollback er jnno create ta ekta array er modde dite hoi + session add korte hobe
    const result = await EnrolledCourse.create(
      [
        {
          semesterRegistration: isOfferedCourseExists.semesterRegistration,
          academicSemester: isOfferedCourseExists.academicSemester,
          academicFaculty: isOfferedCourseExists.academicFaculty,
          academicDepartment: isOfferedCourseExists.academicDepartment,
          isEnrolled: true,
          offeredCourse: offeredCourse,
          course: isOfferedCourseExists.course,
          student: student._id,
          faculty: isOfferedCourseExists.faculty,
        },
      ],
      {
        session,
      },
    );

    if (!result) {
      throw new AppError(401, 'Failed to enroll in the course!');
    }
    const maxCapacity = isOfferedCourseExists.maxCapacity;
    await OfferedCourse.findByIdAndUpdate(offeredCourse, {
      maxCapacity: maxCapacity - 1,
    });

    //result ta patanor age ai duita jinish kora lagbe
    await session.commitTransaction();
    await session.endSession();

    return result;
  } catch (err: any) {
    await session.abortTransaction();
    await session.endSession();
    throw new Error(err);
  }
};

const updateEnrolledCourseMarksIntoDB = async (
  facultyId: string,
  payload: Partial<TEnrolledCourse>,
) => {
  const { semesterRegistration, offeredCourse, student, courseMarks } = payload;
  const isSemesterRegistrationExists =
    await SemesterRegistration.findById(semesterRegistration);

  if (!isSemesterRegistrationExists) {
    throw new AppError(404, 'Semester Registration not found');
  }

  const isOfferedCourseExists = await OfferedCourse.findById(offeredCourse);

  if (!isOfferedCourseExists) {
    throw new AppError(404, 'Offered course not found');
  }

  const isStudentExists = await Student.findById(student);
  if (!isStudentExists) {
    throw new AppError(404, 'Student not found');
  }

  const faculty = await Faculty.findOne(
    { id: facultyId },
    {
      _id: 1,
    },
  );

  if (!faculty) {
    throw new AppError(404, 'Faculty not found');
  }
  //   console.log(faculty);
  const isCourseBelongToFaculty = await EnrolledCourse.findOne({
    semesterRegistration,
    offeredCourse,
    student,
    faculty: faculty._id,
  });

  if (!isCourseBelongToFaculty) {
    throw new AppError(401, 'You are forbidden');
  }

  //   console.log(isCourseBelongToFaculty);

  // dynamic update -> janena value konta ashbe
  const modifiedData: Record<string, unknown> = {
    ...courseMarks,
  };

  //Final term hoie gele -> grade,gpa count hobe
  if (courseMarks?.finalTerm) {
    const { classTest1, classTest2, midTerm, finalTerm } =
      isCourseBelongToFaculty.courseMarks;

    const totalMarks =
      Math.ceil(classTest1 * 0.1) +
      Math.ceil(midTerm * 0.3) +
      Math.ceil(classTest2 * 0.1) +
      Math.ceil(finalTerm * 0.5);
    const result = calculateGradeAndPoints(totalMarks);
    // console.log(result, totalMarks);
    modifiedData.grade = result.grade;
    modifiedData.gradePoints = result.gradePoints;
    modifiedData.isCompleted = true;
  }

  if (courseMarks && Object.keys(courseMarks).length) {
    for (const [key, value] of Object.entries(courseMarks)) {
      modifiedData[`courseMarks.${key}`] = value;
    }
  }

  const result = await EnrolledCourse.findByIdAndUpdate(
    isCourseBelongToFaculty._id,
    modifiedData,
    {
      new: true,
    },
  );
  return result;
};

export const EnrolledCourseServices = {
  createEnrolledCourseIntoDB,
  updateEnrolledCourseMarksIntoDB,
};
