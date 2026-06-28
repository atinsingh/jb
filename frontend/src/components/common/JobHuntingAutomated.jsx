import { FiFileText, FiClock, FiBell } from 'react-icons/fi';

const JobHuntingAutomated = () => {
  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl sm:text-5xl font-bold text-center text-gray-900 mb-4">
          Job Hunting, Automated —
        </h2>
        <h3 className="text-3xl font-semibold text-center text-gray-700 mb-16">
          Your Time Matters.
        </h3>

        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiFileText className="w-8 h-8 text-orange-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">We get to know you</h4>
            <p className="text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiClock className="w-8 h-8 text-orange-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">Fast-track job searching</h4>
            <p className="text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiBell className="w-8 h-8 text-orange-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">We apply for you</h4>
            <p className="text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>
        </div>

        <div className="text-center">
          <button className="inline-flex items-center gap-2 px-8 py-3 border-2 border-gray-900 text-gray-900 font-semibold rounded-lg hover:bg-gray-900 hover:text-white transition-colors">
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobHuntingAutomated;