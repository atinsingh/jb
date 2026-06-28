const RotatingBanner = () => {
  return (
    <div className="bg-gray-900 py-4 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap">
        <span className="text-white text-xl font-semibold mx-8">
          The last stop before your next role!
        </span>
        <span className="text-white text-xl font-semibold mx-8">
          The last stop before your next role!
        </span>
        <span className="text-white text-xl font-semibold mx-8">
          The last stop before your next role!
        </span>
        <span className="text-white text-xl font-semibold mx-8">
          The last stop before your next role!
        </span>
      </div>
    </div>
  );
};

export default RotatingBanner;