export const buildCourseRoute = (template: string, courseId: string) =>
  template.replace(':courseId', courseId);
