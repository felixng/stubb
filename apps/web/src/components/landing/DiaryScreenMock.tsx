import { ShowRow } from "@/components/ui/ShowRow";
import { TabBar } from "@/components/ui/TabBar";

// Static mock of the app's Diary screen for the hero phone, built from the
// design system's ShowRow and TabBar so it matches the iOS app.
const OCTOBER = [
  { title: "Les Misérables", venue: "Sondheim Theatre", date: "3 Oct", rating: 4.5 },
  { title: "Hadestown", venue: "Lyric Theatre", date: "27 Sep", rating: 4 },
  { title: "The Seagull", venue: "Barbican", date: "21 Sep", rating: 3.5 },
  { title: "Operation Mincemeat", venue: "Fortune Theatre", date: "Next week" },
];

export function DiaryScreenMock() {
  return (
    <div className="flex h-full flex-col bg-background text-left">
      <div className="flex-1 overflow-hidden px-4 pt-14">
        <p className="text-subheadline text-label-secondary">@sillyelphaba</p>
        <p className="font-display text-large-title text-label">Diary</p>
        <p className="mt-1 text-subheadline text-label-secondary tabular-nums">
          4 shows this month
        </p>

        <p className="mt-5 px-4 text-footnote text-label-secondary uppercase">
          October
        </p>
        <ul className="mt-2 rounded-md bg-surface">
          {OCTOBER.map((show) => (
            <li
              key={show.title}
              className="ml-4 border-b border-separator pr-4 last:border-b-0"
            >
              <ShowRow {...show} />
            </li>
          ))}
        </ul>
      </div>
      <TabBar active="diary" />
    </div>
  );
}
