const AIDrivenSection = () => {
  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* AI Driven Search Card */}
          <div className="bg-gray-900 rounded-2xl p-12 text-white relative overflow-hidden">
            <p className="text-orange-600 text-sm font-semibold mb-4">AI Driven Search</p>
            <h3 className="text-3xl font-bold mb-8">
              Let the AI find you job just at one click.
            </h3>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
              Get Started
            </button>

            {/* Decorative Elements */}
            <div className="absolute bottom-8 right-8 space-y-2 text-right">
              <div className="text-sm font-medium">Talent</div>
              <div className="text-sm font-medium">Recruiter</div>
              <div className="text-sm font-medium">Career</div>
              <div className="text-sm font-medium">Remote Jobs</div>
            </div>
          </div>

          {/* AI Job Curation Card */}
          <div className="bg-gray-900 rounded-2xl p-12 text-white relative overflow-hidden">
            <p className="text-orange-600 text-sm font-semibold mb-4">AI Job curation</p>
            <h3 className="text-3xl font-bold mb-8">
              The best job updates from companies hiring.
            </h3>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
              Get Started
            </button>

            {/* Decorative Elements */}
            <div className="absolute bottom-8 right-8 space-y-2">
              <div className="inline-block px-4 py-2 bg-gray-800 rounded-full text-sm">Product Designer</div>
              <div className="inline-block px-4 py-2 bg-gray-800 rounded-full text-sm">Graphic Designer</div>
              <div className="inline-block px-4 py-2 bg-orange-600 rounded-full text-sm">Cyber Security</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDrivenSection;