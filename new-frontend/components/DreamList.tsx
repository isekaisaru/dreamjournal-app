type DreamListProps = {
  title: string;
  description: string;
};

const DreamList: React.FC<DreamListProps> = ({ title, description }) => {
  return (
    <div className="max-w-sm rounded overflow-hidden shadow-lg p-4 m-2 bg-white">
      <h2 className="font-bold text-gray-700 text-xl mb-2">{title}</h2>
      <p className="text-gray-700 text-base">{description}</p>
    </div>
  );
};

export default DreamList;