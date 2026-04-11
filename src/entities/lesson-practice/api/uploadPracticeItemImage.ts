import { supabase } from '@/shared/api/supabase/client';

const PRACTICE_ITEM_IMAGES_BUCKET = 'practice-item-images';

type UploadPracticeItemImageParams = {
  file: File;
  lessonId: string;
};

export const uploadPracticeItemImage = async ({
  file,
  lessonId,
}: UploadPracticeItemImageParams): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `${lessonId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(PRACTICE_ITEM_IMAGES_BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || 'image/png',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(PRACTICE_ITEM_IMAGES_BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
};
