import { model, Schema } from 'mongoose';
import { TUser, UserModel } from './user.interface';
import config from '../../config';
import bcrypt from 'bcrypt';
import { UserStatus } from './user.constant';

const userSchema = new Schema<TUser, UserModel>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: 0,
    },
    needsPasswordChange: {
      type: Boolean,
      default: true,
    },
    passwordChangedAt: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
    },
    status: {
      type: String,
      enum: UserStatus,
      default: 'in-progress',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

//pre save middleware/hook -> will work on creat() save () function , save howar age act kore
userSchema.pre('save', async function (next) {
  // console.log(this, 'pre hook : we will save the data');
  //hashing password and save into DB
  const user = this; //this refers to document
  user.password = await bcrypt.hash(
    user.password,
    Number(config.bcrypt_salt_rounds),
  );
  next();
});

//post save middleware/  hook empty string after saving password
userSchema.post('save', function (doc, next) {
  doc.password = '';
  console.log('password has been hashed and cleared');
  next();
});

//static method
userSchema.statics.isUserExistsByCustomId = async function (id: string) {
  return await User.findOne({ id }).select('+password');
};

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashedPassword,
) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = async function (
  passwordChangedTimeStamp: Date,
  jwtIssuedTimeStamp: number,
) {
  console.log(passwordChangedTimeStamp, jwtIssuedTimeStamp);
  // return passwordChangedTimeStamp > jwtIssuedTimeStamp
  const passwordChangedTime =
    new Date(passwordChangedTimeStamp).getTime() / 1000; //converting to millisecond
  return passwordChangedTime > jwtIssuedTimeStamp;
};

export const User = model<TUser, UserModel>('User', userSchema);
