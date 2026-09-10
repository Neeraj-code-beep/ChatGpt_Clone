import { NavLink } from 'react-router-dom';

const Navbar = () => {
  const navlinkActiveColour = ({ isActive }) => {
    return isActive ? 'text-blue-500' : 'text-emerald-300';
  };

  return (
    <div className="p-2 flex justify-center items-center gap-1.5">
      <nav className="flex justify-between items-center gap-2">
        <NavLink to="/" className={navlinkActiveColour}>
          Home
        </NavLink>
        <NavLink to="/register" className={navlinkActiveColour}>
          Register
        </NavLink>
        <NavLink to="/login" className={navlinkActiveColour}>
          Login
        </NavLink>
      </nav>
    </div>
  );
};

export default Navbar;
