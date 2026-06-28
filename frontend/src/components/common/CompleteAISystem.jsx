import { FiCalendar, FiBriefcase, FiUsers } from 'react-icons/fi';

const CompleteAISystem = () => {
  return (
    <div className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side */}
          <div>
            <p className="text-orange-600 text-sm font-semibold mb-4">AI Job Curation</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              The Complete AI System for Smarter Career Results
            </h2>
            <p className="text-2xl text-white font-semibold mb-8">
              Introducing our AI-powered job assistant for all career-driven professionals.
            </p>
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors">
              Get Started
            </button>

            <div className="mt-8 flex gap-4">
              <div className="bg-white rounded-full px-4 py-2 text-sm font-medium">AI Content Strategist</div>
              <div className="bg-white rounded-full px-4 py-2 text-sm font-medium">Prompt Engineer</div>
            </div>
          </div>

          {/* Right Side - Feature Cards */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <FiCalendar className="w-10 h-10 text-gray-900 mb-4" />
              <h3 className="text-sm font-bold text-gray-900 mb-2">CURATED SEARCH</h3>
              <p className="text-gray-600">
                Save 10+ hours a week with our AI-powered job curation — no more endless searching.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <FiBriefcase className="w-10 h-10 text-gray-900 mb-4" />
              <h3 className="text-sm font-bold text-gray-900 mb-2">ADVANCED METHODS</h3>
              <p className="text-gray-600">
                Unlock AI-powered job hacks that 99% of professionals miss — and get a real career edge.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <FiUsers className="w-10 h-10 text-gray-900 mb-4" />
              <h3 className="text-sm font-bold text-gray-900 mb-2">STRATEGIC OUTPUT</h3>
              <p className="text-gray-600">
                Go beyond surface-level job hunting — use AI for strategic, high-quality career moves.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteAISystem;