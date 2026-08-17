import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

/* Everything that wears the public header: home, login and register. A route
   group, so `(site)` shapes the layout without showing up in a single URL.

   It exists because the jam builder needs a *different* header, and a child
   layout can't switch off one its parent rendered. Moving the header down one
   level is what lets `(builder)` render its own instead of hiding this one. */
export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      {/* Fixed, so it sits outside the flow and overlays the hero video. Pages
          under here clear it themselves — see the padding in (auth)/layout. */}
      <Header />
      {children}
      {/* Here rather than in the root layout, for the same reason the header is:
          the builder is a full-screen wizard and shouldn't grow a sitemap under
          its last step. */}
      <Footer />
    </>
  );
}
