const ThreeStepsExact = () => {
  const steps = [
    {
      number: 1,
      title: 'Tell Us What You Want',
      description: 'Set your job preferences—role, location, and goals.'
    },
    {
      number: 2,
      title: 'AI Curates for You',
      description: 'Get a personalized list of jobs that match your vibe.'
    },
    {
      number: 3,
      title: 'Just Tap \'Yes\'',
      description: 'Approve jobs and our AI applies instantly—no forms, no hassle.'
    }
  ];

  return (
    <div className="py-20" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm mb-3" style={{ color: '#999999', fontFamily: 'Manrope, sans-serif' }}>
          AI based job search
        </p>
        <h2 className="font-bold text-center mb-16" style={{ fontSize: '36px', color: '#333333', fontFamily: 'Manrope, sans-serif', lineHeight: '1.3' }}>
          Land Your Next Job In 3 Simple Steps— Powered By AI..
        </h2>

        <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-12 perspective-1000">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="flex-1 max-w-sm"
              style={{ 
                transform: index === 0 ? 'rotateY(5deg)' : index === 2 ? 'rotateY(-5deg)' : 'none',
                zIndex: index === 1 ? 10 : 5
              }}
            >
              <div className="rounded-2xl p-8 shadow-2xl relative overflow-hidden" style={{ backgroundColor: '#1A1A1A', minHeight: '320px' }}>
                {/* Dot indicator */}
                <div className="absolute top-6 left-6 w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
                
                {/* Number badge */}
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold mb-6" style={{ backgroundColor: '#FF6633', color: '#FFFFFF', fontFamily: 'Manrope, sans-serif' }}>
                  {step.number}
                </div>
                
                <h3 className="font-bold mb-4" style={{ fontSize: '22px', color: '#FFFFFF', fontFamily: 'Manrope, sans-serif' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '15px', color: '#CCCCCC', lineHeight: '24px', fontFamily: 'Manrope, sans-serif' }}>
                  {step.description}
                </p>
                
                {/* Decorative pattern */}
                <div className="absolute bottom-0 left-0 right-0 h-24" style={{
                  background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 10px, transparent 10px, transparent 20px)',
                  opacity: 0.5
                }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Orange starburst icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6633' }}>
            <svg className="w-8 h-8" style={{ color: '#FFFFFF' }} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeStepsExact;
