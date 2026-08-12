import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* Session photos are served from Cloudinary, and next/image refuses any
       remote host it wasn't told about — an allowlist rather than a default-open
       proxy, so this app's image endpoint can't be pointed at the whole web.
       `domains` used to do this and was removed in Next 16.

       Which Cloudinary account is not pinned here: the API only ever stores URLs
       it uploaded itself, and it checks that on the way in. */
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
