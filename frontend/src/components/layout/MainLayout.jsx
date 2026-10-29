import Header from "./Header";
import Footer from "./Footer";

export default function MainLayout({ children }) {
return ( <div className="flex min-h-screen flex-col bg-slate-50"> <Header />


  <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
    {children}
  </main>

  <Footer />
</div>


);
}
