import { useEffect } from 'react';

function useViewportHeight() {
  useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set the viewport height when the component is mounted
    setViewportHeight();

    // Update the viewport height on window resize
    window.addEventListener('resize', setViewportHeight);

    // Clean up the event listener on unmount
    return () => window.removeEventListener('resize', setViewportHeight);
  }, []);
}

export default useViewportHeight;
