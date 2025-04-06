//Schema and model

import validator from 'validator';
import { Schema, model, connect } from 'mongoose';
import {
  TGuradian,
  TLocalGuardian,
  TStudent,
  StudentModel,
  TUserName,
} from './student.interface';

const userNameSchema = new Schema<TUserName>({
  firstName: {
    type: String,
    required: [true, 'First Name is required'],
    //Shamne age space allow korena
    trim: true,
    //maximun length allowed
    maxlength: [20, 'first-name cannot be more than 20'],
    //custom validation -> normal fucntion use korte hoeb
    //value ta hocce firstName e jeita input korse "Mezba"
    validate: {
      validator: function (value: string) {
        const firstNameStr = value.charAt(0).toUpperCase() + value.slice(1);
        if (value !== firstNameStr) {
          return false;
        }
        return true;
      },
      message: '{VALUE} is not in capitalize format',
    },
  },
  middleName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
    required: [true, 'Last Name is required'],
    validate: {
      validator: (value: string) => validator.isAlpha(value),
      message: '{VALUE} is not valid',
    },
  },
});

const guardianSchema = new Schema<TGuradian>({
  fatherName: {
    type: String,
    required: true,
  },
  fatherOccupation: {
    type: String,
    required: true,
  },
  fatherContactNo: {
    type: String,
    required: true,
  },
  motherName: {
    type: String,
    required: true,
  },
  motherOccupation: {
    type: String,
    required: true,
  },
  motherContactNo: {
    type: String,
    required: true,
  },
});

const localGuardianSchema = new Schema<TLocalGuardian>({
  name: { type: String, required: true },
  occupation: { type: String, required: true },
  contactNo: { type: String, required: true },
  address: { type: String, required: true },
});

// Mongoose e String boro haate likba
const studentSchema = new Schema<TStudent, StudentModel>(
  {
    //unique index create kore and avoids duplciate entries
    id: { type: String, required: true, unique: true },
    user: {
      type: Schema.Types.ObjectId,
      required: [true, 'User Id is required'],
      unique: true,
      ref: 'User',
    },
    name: {
      type: userNameSchema,
      // required: true, //you can write like this or if you want to give a message by yourself follow the down one
      required: [true, 'bhai first name lagbei lagbe'],
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other'],
        message:
          'The gender field can only be one of the following : {VALUE} is not supported male , female or other',
      }, //enum type is similar to union type
      required: true,
    },
    dateOfBirth: { type: Date },
    //unique stops from duplicating
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: '{VALUE} is not a valid email',
      },
    },
    contactNo: { type: String, required: true },
    emergencyContactNo: { type: String, required: true },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    presentAddress: { type: String, required: true },
    permanentAddress: { type: String, required: true },
    guardian: {
      type: guardianSchema,
      required: true,
    },
    localGuardian: {
      type: localGuardianSchema,
      required: true,
    },
    profileImg: { type: String },
    admissionSemester: { type: Schema.Types.ObjectId, ref: 'AcademicSemester' },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    academicDepartment: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicDepartment',
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
  },
);

//virtual aita lastName e field add korte parbe
studentSchema.virtual('fullName').get(function () {
  return `${this?.name?.firstName} ${this?.name?.middleName} ${this?.name?.lastName}`;
});

//creating a custom static method
studentSchema.statics.isUserExists = async function (id: string) {
  const existingUser = await Student.findOne({ id: id });
  return existingUser;
};

//Query middleware
//Pre hook
studentSchema.pre('find', function (next) {
  // console.log(this);
  //jeigulo isDeleted ase update it to true and chain kore felab
  this.find({ isDeleted: { $ne: true } });
  next();
});

studentSchema.pre('findOne', function (next) {
  // console.log(this);
  //jeigulo isDeleted ase update it to true and chain kore felab
  this.find({ isDeleted: { $ne: true } });
  next();
});

// //returns a pipeline ->[ { $match: { $isDeleted: {$ne : true} } ]   => [ { '$match': { '$id': '1001125111' } } ]
studentSchema.pre('aggregate', function (next) {
  // console.log(this);
  //jeigulo isDeleted ase update it to true and chain kore felab, unshift shobar age add kore
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

export const Student = model<TStudent, StudentModel>('Student', studentSchema);
