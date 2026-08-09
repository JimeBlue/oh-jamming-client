/* Cloudinary delivery URLs. Only the cloud name lives in the environment —
   public IDs are content, so they stay next to the component that uses them. */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/* f_auto:video serves webm/av1 to Chrome and mp4 to Safari, q_auto handles
   compression, ac_none strips the audio track (a background video is always
   muted, so it's dead weight), and du_12 trims the loop to 12 seconds. */
const VIDEO_TRANSFORMS = 'f_auto:video,q_auto,ac_none,w_1920,c_limit,du_12';

/* A still frame 2 seconds in, used as the <video> poster so the first paint
   isn't a black rectangle. */
const POSTER_TRANSFORMS = 'so_2,w_1920,c_limit,q_auto,f_jpg';

/* Both return null when the cloud name isn't set, which lets callers render a
   solid fallback instead of a broken request. */
export function cloudinaryVideo(publicId: string): string | null {
  if (!CLOUD_NAME) return null;
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${VIDEO_TRANSFORMS}/${publicId}`;
}

export function cloudinaryPoster(publicId: string): string | null {
  if (!CLOUD_NAME) return null;
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${POSTER_TRANSFORMS}/${publicId}.jpg`;
}
