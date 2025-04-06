import express from 'express';
import { AcadmicSemesterControllers } from './academicSemester.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AcademicSemesterValidations } from './academicSemester.validation';

const router = express.Router();

router.post(
  '/create-academic-semester',
  validateRequest(
    AcademicSemesterValidations.createAcademicSemesterValidationSchema,
  ),
  AcadmicSemesterControllers.createAcademicSemester,
);

router.get(
  '/:semesterId',
  AcadmicSemesterControllers.getSingleAcademicSemester,
);

router.patch('/:semesterId', AcadmicSemesterControllers.updateAcademicSemester);

router.get('/', AcadmicSemesterControllers.getAllAcademicSemesters);

export const AcademicSemesterRoutes = router;
