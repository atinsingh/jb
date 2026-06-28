const TopCompanies = () => {
  const companies = ['Hitech', 'Sitemark', 'Volume', 'ICEBERG', 'Vision'];

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-center text-sm text-gray-600 font-semibold mb-8">
          Top Companies Hiring
        </h3>
        <div className="flex flex-wrap justify-center items-center gap-12">
          {companies.map((company, index) => (
            <div key={index} className="text-2xl font-bold text-gray-400">
              {company}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopCompanies;
