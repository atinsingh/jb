const TopCompaniesHiring = () => {
  const companies = ['hHitech', 'Sitemark', 'Volume', 'ICEBERG', 'vision'];

  return (
    <div className="py-12" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-center text-sm mb-8" style={{ color: '#333333', fontFamily: 'Manrope, sans-serif', fontWeight: '600' }}>
          Top Companies Hiring
        </h3>
        <div className="flex flex-wrap justify-center items-center gap-16">
          {companies.map((company, index) => (
            <div key={index} className="text-2xl font-bold" style={{ color: '#CCCCCC', fontFamily: 'Manrope, sans-serif' }}>
              {company}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopCompaniesHiring;
