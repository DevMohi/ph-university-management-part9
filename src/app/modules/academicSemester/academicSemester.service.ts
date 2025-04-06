import AppError from '../../errors/AppError';
import { academicSemesterNameCodeMapper } from './academicSemester.constant';
import { TAcademicSemester } from './academicSemester.interface';
import { AcademicSemester } from './academicSemester.model';

const createAcademicSemesterIntoDB = async (payLoad: TAcademicSemester) => {
  //semester name --> semester code

  //aibave declare na kore dynamic bhave declare korbo
  // type TAcademicSemesterNameCodeMapper = {
  //   Autumn: '01';
  //   Summer: '02';
  //   Fall: '03';
  // };

  //academicSemesterNameCodeMapper['Fall'] = 03
  if (academicSemesterNameCodeMapper[payLoad.name] !== payLoad.code) {
    throw new AppError(404, 'Invalid Semester code');
  }

  const result = await AcademicSemester.create(payLoad);
  return result;
};

const getAllAcademicSemestersFromDB = async () => {
  const result = await AcademicSemester.find();
  return result;
};

const getSingleAcademicSemesterFromDB = async (id: string) => {
  const result = await AcademicSemester.findById(id);
  return result;
};

const updateAcademicSemesterIntoDB = async(id : string , payLoad : Partial<TAcademicSemester>) => {
  if(payLoad.name && payLoad.code  && academicSemesterNameCodeMapper[payLoad.name] !== payLoad.code){
    throw new AppError(404,'Invalid Semester Code');
  }
  const result = await AcademicSemester.findByIdAndUpdate(id , payLoad, {new : true})
  return result; 
}

export const AcademicSemesterServices = {
  createAcademicSemesterIntoDB,
  getAllAcademicSemestersFromDB,
  getSingleAcademicSemesterFromDB,
  updateAcademicSemesterIntoDB
};

//Eki bochore eki name duita eki semester toiri hobena
