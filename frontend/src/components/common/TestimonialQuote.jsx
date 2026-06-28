const TestimonialQuote = () => {
  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Heading */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Revolutionizing the job market.
            </h2>
          </div>

          {/* Right Side - Quote */}
          <div className="bg-gray-900 rounded-2xl p-12 text-white relative">
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full grid grid-cols-8 gap-2 p-4">
                {[...Array(64)].map((_, i) => (
                  <div key={i} className="border border-white"></div>
                ))}
              </div>
            </div>
            <div className="relative z-10">
              <svg className="w-12 h-12 text-orange-600 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-xl italic mb-6">
                “We list our role opening on Jobocate, it makes our recruitment easier. Plus they only list jobs that are actively hiring.”
              </p>
              <p className="text-sm text-gray-400">
                — Talent Recruitment, Pragra
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialQuote;