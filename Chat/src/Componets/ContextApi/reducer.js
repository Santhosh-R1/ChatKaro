const getInitialState = () => {
  try {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      return {
        user: JSON.parse(savedUser)
      };
    }
  } catch (error) {
    console.error("Failed to parse user from localStorage", error);
    return {
      user: null
    };
  }
  
  return {
    user: null,
  };
};

export const initialState = getInitialState();

export const actionTypes = {
  SET_USER: "SET_USER",
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_USER:
      const newUser = action.user;

      if (newUser) {
        localStorage.setItem("user", JSON.stringify(newUser));
      } else {
        localStorage.removeItem("user");
      }

      return {
        ...state, 
        user: newUser,
      };

    default:
      return state;
  }
};

export default reducer;