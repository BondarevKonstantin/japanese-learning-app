import { supabase } from '@/shared/api/supabase/client';

type UploadLessonTheoryImageParams = {
  file: File;
};

const LESSON_IMAGES_BUCKET = 'lesson-images';

export const uploadLessonTheoryImage = async ({
  file,
}: UploadLessonTheoryImageParams): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `${crypto.randomUUID()}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(LESSON_IMAGES_BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || 'image/png',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(LESSON_IMAGES_BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
};
