import { useCallback, useEffectEvent, useLayoutEffect, useRef } from "react";

// With cacheComponents, Next keeps a page we navigate away from alive (hidden)
// and shows it again on return with its useState values intact; only effects
// clean up and re-run. So a page that finished a task (saved, created, moved
// on) would come back still showing it.
//
// Call the returned function when the task is done; `reset` then runs the next
// time the page is shown, before it paints. Until then nothing changes, so a
// stray tap on another tab keeps an unfinished draft or selection.
//
// To start a whole component over, keep a counter as its key:
//   const [round, setRound] = useState(0);
//   const done = useFreshOnReturn(() => setRound((r) => r + 1));
//   return <Form key={round} onDone={done} />;
export function useFreshOnReturn(reset: () => void) {
  const pending = useRef(false);
  const onShow = useEffectEvent(() => {
    if (!pending.current) return;
    pending.current = false;
    reset();
  });
  // Runs again each time the hidden page is shown.
  useLayoutEffect(() => onShow(), []);
  return useCallback(() => {
    pending.current = true;
  }, []);
}
