// Use Tailwind classes to avoid inline styles
export function createLikeButton(initialLikes = 0) {
  const wrapper = document.createElement("div");
  wrapper.className =
    "like-wrapper relative w-10 h-10 flex items-center justify-center pointer-events-auto";

  const button = document.createElement("button");
  button.className = `
    like-btn absolute right-2 bottom-2 w-9 h-9 rounded-full border-0 
    bg-white shadow-sm cursor-pointer flex items-center justify-center text-lg
  `;
  button.title = "Like";

  const badge = document.createElement("span");
  badge.className = `
    like-badge absolute -top-[6px] -right-[6px] min-w-[18px] h-[18px] px-1 rounded-[9px] 
    bg-[#ff3b30] text-white text-[12px] flex items-center justify-center
  `;
  badge.textContent = initialLikes;
  badge.style.display = initialLikes > 0 ? "flex" : "none";

  button.appendChild(badge);
  wrapper.appendChild(button);

  return wrapper;
}
