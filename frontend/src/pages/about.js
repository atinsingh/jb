import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';

const team = [
  {
    name: 'Alex Chen',
    role: 'CEO & Co-founder',
    bio: 'Former Google engineer with 10+ years in AI/ML. Passionate about democratizing access to career opportunities.',
    avatar: 'AC'
  },
  {
    name: 'Sarah Williams',
    role: 'CTO & Co-founder',
    bio: 'Built recommendation systems at Netflix. Expert in NLP and machine learning applications.',
    avatar: 'SW'
  },
  {
    name: 'Marcus Johnson',
    role: 'Head of Product',
    bio: 'Previously led product at LinkedIn Jobs. Deep understanding of recruiter and job seeker needs.',
    avatar: 'MJ'
  },
  {
    name: 'Emily Rodriguez',
    role: 'Head of AI',
    bio: 'PhD in Computer Science from Stanford. Pioneered advancements in resume parsing and job matching.',
    avatar: 'ER'
  },
];

const values = [
  {
    title: 'User First',
    description: 'Every decision we make starts with how it impacts job seekers. Your success is our success.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  },
  {
    title: 'Transparency',
    description: 'We only apply to verified company career pages. No hidden job boards or questionable listings.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  },
  {
    title: 'Privacy',
    description: 'Your data belongs to you. GDPR compliant with full control over your information.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  },
  {
    title: 'Innovation',
    description: 'We continuously improve our AI to give you the best possible job search experience.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  },
];

const milestones = [
  { year: '2022', title: 'Founded', description: 'Started with a simple mission: make job searching less painful.' },
  { year: '2023', title: '100K Users', description: 'Reached our first major milestone with users across 50 countries.' },
  { year: '2023', title: 'Series A', description: 'Raised $15M to accelerate product development and AI capabilities.' },
  { year: '2024', title: '1M Applications', description: 'Processed over 1 million job applications for our users.' },
];

export default function About() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>About Us - Jobocate | AI-Powered Job Search Platform</title>
        <meta name="description" content="Learn about Jobocate's mission to revolutionize job searching with AI. Meet our team and discover our values." />
      </Head>

      <Navbar />

      <main>
      {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-primary-50/50 via-white to-white">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary-100/40 rounded-full blur-[100px]" />
            <div className="dot-pattern absolute inset-0 opacity-30" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">About Jobocate</span>
              <h1 className="text-5xl md:text-7xl font-display font-bold text-gray-900 mt-4 mb-6">
                On a Mission to <span className="gradient-text">Transform</span> Job Search
          </h1>
              <p className="max-w-3xl mx-auto text-xl text-gray-600">
                We believe everyone deserves access to great career opportunities. Our AI-powered platform levels the playing field, helping job seekers compete with confidence.
              </p>
            </motion.div>
        </div>
      </section>

        {/* Story Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Our Story</span>
                <h2 className="text-4xl font-display font-bold text-gray-900 mt-4 mb-6">
                  Born from Frustration, Built with Purpose
            </h2>
                <div className="space-y-4 text-gray-600 text-lg">
                  <p>
                    We've all been there—spending hours customizing resumes, filling out endless application forms, and hearing nothing back. The job search process is broken.
                  </p>
                  <p>
                    Our founders experienced this firsthand. Despite having great skills and experience, they watched as their applications disappeared into the void. They knew there had to be a better way.
                  </p>
                  <p>
                    That's why we built Jobocate—an AI-powered platform that does the heavy lifting so you can focus on what matters: preparing for interviews and landing your dream job.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100 p-8 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl font-display font-bold gradient-text mb-4">2022</div>
                    <p className="text-gray-600 text-lg">Year Founded</p>
            </div>
                </div>
                <div className="absolute -bottom-4 -right-4 px-6 py-3 bg-white border border-gray-100 rounded-xl shadow-lg">
                  <span className="text-primary-600 font-semibold">500K+ jobs applied</span>
                </div>
              </motion.div>
          </div>
        </div>
      </section>

        {/* Values Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Our Values</span>
              <h2 className="text-4xl font-display font-bold text-gray-900 mt-4">
                What We Stand For
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary-100 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100 flex items-center justify-center text-primary-500 mb-4">
                    {value.icon}
              </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Our Journey</span>
              <h2 className="text-4xl font-display font-bold text-gray-900 mt-4">
                Milestones
              </h2>
            </motion.div>

            <div className="relative">
              <div className="absolute left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-primary-200 via-orange-200 to-transparent" />
              
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.year + milestone.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative flex items-center gap-8 mb-12 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className="flex-1 text-right">
                    {index % 2 === 0 && (
                      <div className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
                        <div className="text-primary-600 font-bold mb-1">{milestone.year}</div>
                        <div className="text-gray-900 font-semibold mb-2">{milestone.title}</div>
                        <p className="text-gray-600 text-sm">{milestone.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary-500 to-orange-500 border-4 border-white shadow z-10" />
                  <div className="flex-1">
                    {index % 2 !== 0 && (
                      <div className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
                        <div className="text-primary-600 font-bold mb-1">{milestone.year}</div>
                        <div className="text-gray-900 font-semibold mb-2">{milestone.title}</div>
                        <p className="text-gray-600 text-sm">{milestone.description}</p>
                </div>
                    )}
              </div>
                </motion.div>
              ))}
          </div>
        </div>
      </section>

        {/* Team Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Our Team</span>
              <h2 className="text-4xl font-display font-bold text-gray-900 mt-4 mb-4">
                Meet the People Behind Jobocate
          </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We're a diverse team of engineers, designers, and industry experts united by a common goal.
          </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center text-white text-3xl font-bold group-hover:scale-105 transition-transform duration-300 shadow-lg">
                    {member.avatar}
            </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-primary-600 text-sm mb-3">{member.role}</p>
                  <p className="text-gray-500 text-sm">{member.bio}</p>
                </motion.div>
              ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
        <section className="py-24 relative overflow-hidden bg-gray-900">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
                Join Us on the Journey
          </h2>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                Whether you're looking for your next career move or want to join our team, we'd love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white text-lg font-semibold rounded-full transition-all duration-300"
                >
                  Start Your Job Search
                </Link>
                <Link
                  href="/careers"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-lg font-medium rounded-full hover:bg-white/20 transition-all duration-300"
                >
                  Join Our Team
          </Link>
              </div>
            </motion.div>
        </div>
      </section>
      </main>

      <Footer />
    </div>
  );
}
