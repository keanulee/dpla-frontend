import ReactGA from "react-ga";
import trackGaEvent from "./trackGaEvent";

const trackClickThrough = (e, gaEvent, href, target = "_blank") => {
  // e is a React synthetic event
  e.preventDefault();

  try {
    // Try tracking a Google Analytics event.
    trackGaEvent(gaEvent);
  } catch (error) {
    // TODO: What is the best way to log an error?
  } finally {
    // Open the link, even if the Google Analytics event tracking failed.
    window.open(href, target);
  }
};

export default trackClickThrough;
