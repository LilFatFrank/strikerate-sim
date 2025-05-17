export const getStatusBadge = (status: "UPCOMING" | "LOCKED" | "COMPLETED") => {
    switch (status) {
      case "UPCOMING":
        return "text-[#ffd400]";
      case "LOCKED":
        return "text-[#ff503b]";
      case "COMPLETED":
        return "text-[#3fe0aa]";
      default:
        return "text-[#e6e7e8]";
    }
  };
