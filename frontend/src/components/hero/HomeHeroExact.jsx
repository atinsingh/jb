import { useRouter } from 'next/router';
import Image from 'next/image';
import { FiArrowRight } from 'react-icons/fi';
import girl from '@/assets/home/home_girl.png';
import boy from '@/assets/home/home_boy.png';

const HomeHeroExact = () => {
  const router = useRouter();

  return (
    <div className="relative flex items-center justify-center py-20" style={{ backgroundColor: '#FFFFFF', minHeight: '600px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between gap-12">
          {/* Left Illustration */}
          <div className="hidden lg:block flex-shrink-0" style={{ width: '320px' }}>
            <Image src={girl} alt="Job seeker" width={320} height={450} className="object-contain" />
          </div>

          {/* Center Content */}
          <div className="flex-1 text-center max-w-2xl">
            <p className="text-sm mb-4" style={{ color: '#999999', fontFamily: 'Manrope, sans-serif' }}>
              We are your future
            </p>
            
            <h1 className="font-bold leading-tight mb-6" style={{ fontSize: '48px', fontFamily: 'Manrope, sans-serif' }}>
              <span style={{ color: '#333333' }}>AI-Powered Reach.</span>
              <br />
              <span style={{ color: '#FF6633' }}>Human-Smart Precision.</span>
              <br />
              <span style={{ color: '#333333' }}>10x Faster Job Applications</span>
            </h1>

            <p className="mb-8 max-w-xl mx-auto" style={{ fontSize: '16px', color: '#333333', lineHeight: '26px', fontFamily: 'Manrope, sans-serif' }}>
              Our AI-driven platform automates your job search by constantly finding and applying to the right roles—until you land the job
            </p>

            <button
              onClick={() => router.push('/candidate/resume/upload')}
              className="inline-flex items-center gap-3 px-10 py-4 font-semibold rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#2B3D4F', color: '#FFFFFF', fontSize: '16px', fontFamily: 'Manrope, sans-serif' }}
            >
              Start Applying Now
              <FiArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right Illustration */}
          <div className="hidden lg:block flex-shrink-0" style={{ width: '320px' }}>
            <Image src={boy} alt="Professional" width={320} height={450} className="object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeHeroExact;
