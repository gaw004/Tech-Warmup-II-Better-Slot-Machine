import { BottomBarDemo } from './ui/BottomBarDemo';
import { ReelGridDemo } from './ui/ReelGridDemo';
import { RetentionScreensDemo } from './ui/RetentionScreensDemo';
import { TopBarDemo } from './ui/TopBarDemo';
import { WinOverlayDemo } from './ui/WinOverlayDemo';

// P14 + P15 + P16 + P19 + P21 acceptance mount. P23's GameController will
// replace this once the game loop lands; until then the demo pages are the
// only visible view.
function App() {
  return (
    <>
      <ReelGridDemo />
      <BottomBarDemo />
      <TopBarDemo />
      <WinOverlayDemo />
      <RetentionScreensDemo />
    </>
  );
}

export default App;
