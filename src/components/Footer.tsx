const Footer = () => {
  return (
    <footer className="w-full bg-black/20 backdrop-blur-sm border-t border-white/5 py-3 mt-4">
      <div className="w-full px-6">
        <div className="text-center space-y-2">
          <p className="text-gray-500 text-xs leading-relaxed max-w-5xl mx-auto">
            This website showcases our art development as non-artists learning and having fun challenging ourselves to draw fake Pokemon.  
            As we're just learning, some art may seem very similar to other fakemon art out there as we get inspired from images online. 
            This is purely for FUN! - Commercial use or distribution of this artwork is NOT allowed.
          </p>
          <p className="text-gray-600 text-xs">
            Website created by <span className="text-gray-400">David Maddin</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;