import Navbar from './components/Navbar';
import Mainroutes from './routes/Mainroutes';

const App = () => {
  return (
    <div className="h-screen bg-amber-300">
      <div className="flex flex-col justify-center items-center gap-2.5">
        <Navbar />
        <Mainroutes />
      </div>
    </div>
  );
};

export default App;
