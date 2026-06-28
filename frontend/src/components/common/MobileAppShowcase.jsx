const MobileAppShowcase = () => {
  return (
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Phone Mockup */}
          <div className="flex justify-center">
            <div className="relative w-80 h-[600px] bg-gray-900 rounded-[3rem] p-4 shadow-2xl">
              <div className="bg-white h-full rounded-[2.5rem] overflow-hidden">
                <div className="p-6">
                  <div className="text-center mb-8">
                    <p className="text-sm text-gray-500 mb-2">We are your future</p>
                    <h3 className="text-2xl font-bold text-gray-900">AI-powered reach,</h3>
                    <h3 className="text-2xl font-bold text-orange-600">human-smart results</h3>
                    <p className="text-lg text-gray-700">10x job applications</p>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Job Title, Keywords..." 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                    <button className="w-full py-3 bg-gray-900 text-white font-semibold rounded-lg">
                      Search Job
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div>
            <p className="text-orange-600 text-sm font-semibold mb-4">Why Us</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              We Work Nonstop Until You Land The Job.
            </h2>
            <p className="text-gray-600 mb-8">
              Advertise your jobs to millions of monthly users
            </p>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-orange-600 text-xl">✓</span>
                <span className="text-gray-700">Automate your job search</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 text-xl">✓</span>
                <span className="text-gray-700">Wake up to your best matches</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 text-xl">✓</span>
                <span className="text-gray-700">10x your job applications</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 text-xl">✓</span>
                <span className="text-gray-700">Reclaim valuable hours every week</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAppShowcase;