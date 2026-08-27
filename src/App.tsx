import AudienceView from "./audience/AudienceView";
import PresenterConsole from "./presenter/PresenterConsole";

function isPresenter(): boolean {
  return new URLSearchParams(window.location.search).get("mode") === "presenter";
}

export default function App() {
  return isPresenter() ? <PresenterConsole /> : <AudienceView />;
}
