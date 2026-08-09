import { cloudinaryPoster, cloudinaryVideo } from '@/lib/cloudinary';

/* The public ID of the uploaded asset. No version segment, so replacing the
   video in Cloudinary takes effect without touching this file. */
const HERO_VIDEO_ID = 'hero_ozjsma';

const videoSrc = cloudinaryVideo(HERO_VIDEO_ID);
const posterSrc = cloudinaryPoster(HERO_VIDEO_ID);

export default function Hero() {
  return (
    /* bg-neutral is what shows through until the video loads — and what you
       see entirely if the Cloudinary cloud name isn't set yet. */
    <section className="relative flex h-[70vh] min-h-[480px] items-center overflow-hidden bg-neutral">
      {videoSrc && (
        // muted + playsInline are both required for autoplay on mobile browsers.
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={videoSrc}
          poster={posterSrc ?? undefined}
          autoPlay
          muted
          loop
          playsInline
        />
      )}

      <div className="absolute inset-0 bg-black/50" />

      {/* pt-20 clears the fixed header so the headline never sits under it. */}
      <div className="relative mx-auto w-full max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl leading-[1.1] text-white sm:text-5xl lg:text-6xl xl:text-7xl">
          <span className="block">Find jam sessions</span>
          <span className="block">that make your heart</span>
          <span className="block text-accent">skip a beat.</span>
        </h1>
      </div>
    </section>
  );
}
