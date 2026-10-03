"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Globe2,
  MapPin,
  Beer,
  Plus,
  Compass,
  Search,
  Settings,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Star,
  Lock,
  Share2,
  Download,
  Camera,
  Check,
  Map,
  BarChart3,
  Navigation,
  Menu,
  Ellipsis,
  LogOut,
  Trash2,
  Heart,
  Stamp,
  ArrowUpRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { Toaster, toast } from "sonner";
import PassportMap, { type MapVenue } from "@/components/passport-map";
import {
  examples,
  venues as exampleVenues,
  flag,
  stats,
  type Experience,
  type Venue,
} from "@/lib/data";
type View = "passport" | "journal" | "map" | "explore" | "stats" | "settings";
const navigation = [
  { id: "passport", name: "My passport", icon: BookOpen },
  { id: "journal", name: "My journal", icon: Beer },
  { id: "map", name: "My map", icon: Map },
  { id: "explore", name: "Explore the world", icon: Compass },
  { id: "stats", name: "My stats", icon: BarChart3 },
] as const;
const dateText = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const emptyDraft = () => ({
  beer: "",
  brewery: "",
  style: "",
  abv: "",
  venueId: "",
  rating: "",
  date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16),
  price: "",
  currency: "GBP",
  notes: "",
  venueNotes: "",
  drinkAgain: true,
  wouldReturn: true,
  venueRating: "",
  pourRating: "",
  priceRating: "",
  contribute: false,
  photoId: null as string | null,
});
async function api(path: string, options?: RequestInit) {
  const r = await fetch("/api/" + path, options);
  const data: any = r.status === 204 ? {} : await r.json();
  if (!r.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
export default function App() {
  const [view, setView] = useState<View>("passport"),
    [user, setUser] = useState<{ id: string; name: string } | null>(null),
    [authReady, setAuthReady] = useState(false),
    [loading, setLoading] = useState(true),
    [entries, setEntries] = useState<Experience[]>(examples),
    [places, setPlaces] = useState<Venue[]>(exampleVenues),
    [explore, setExplore] = useState<MapVenue[]>([]),
    [country, setCountry] = useState("all"),
    [city, setCity] = useState("all"),
    [venueFilter, setVenueFilter] = useState("all"),
    [year, setYear] = useState("all"),
    [search, setSearch] = useState(""),
    [log, setLog] = useState(false),
    [detail, setDetail] = useState<Experience | null>(null),
    [selectedVenue, setSelectedVenue] = useState<string | null>(null),
    [share, setShare] = useState(false),
    [shareEntry, setShareEntry] = useState<Experience | null>(null),
    [sign, setSign] = useState(false),
    [draft, setDraft] = useState(emptyDraft()),
    [editing, setEditing] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [photo, setPhoto] = useState<string | null>(null),
    [photoBlob, setPhotoBlob] = useState<Blob | null>(null),
    [venueOptions, setVenueOptions] = useState<Venue[]>(exampleVenues),
    [addVenue, setAddVenue] = useState(false),
    [newVenue, setNewVenue] = useState({
      name: "",
      city: "",
      countryCode: "GB",
      lat: "",
      lng: "",
    }),
    [confirm, setConfirm] = useState<"entry" | "account" | null>(null),
    [more, setMore] = useState(false),
    [error, setError] = useState("");
  const demo = !user;
  async function refresh() {
    const d = await api("journal");
    setEntries(
      d.experiences.map((e: any) => ({
        ...e,
        drinkAgain: !!e.drinkAgain,
        wouldReturn: !!e.wouldReturn,
        contribute: !!e.contribute,
      })),
    );
    setPlaces(d.venues);
  }
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api("me");
        if (!live) return;
        setUser(d.user);
        setAuthReady(d.authConfigured);
        if (d.user) await refresh();
        const global = await api("explore");
        if (live) setExplore(global.venues);
      } catch {
        if (live)
          setError(
            "We couldn’t connect to your passport. Please refresh to try again.",
          );
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  const resetFilters = () => {
    setCountry("all");
    setCity("all");
    setVenueFilter("all");
    setSearch("");
  };
  const navigate = (v: View) => {
    setView(v);
    resetFilters();
    setSelectedVenue(null);
  };
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "open_beer_passport_view",
          description:
            "Navigate to a passport, journal, personal map, explore map, stats or settings view.",
          inputSchema: {
            type: "object",
            properties: {
              view: {
                type: "string",
                enum: [
                  "passport",
                  "journal",
                  "map",
                  "explore",
                  "stats",
                  "settings",
                ],
              },
            },
            required: ["view"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute: async (input: any) => {
            if (
              ![
                "passport",
                "journal",
                "map",
                "explore",
                "stats",
                "settings",
              ].includes(input?.view)
            )
              throw new Error("Invalid view");
            navigate(input.view);
            return { view: input.view };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        const v = places.find((p) => p.id === e.venueId);
        return (
          (country === "all" || v?.countryCode === country) &&
          (city === "all" || v?.city === city) &&
          (venueFilter === "all" || e.venueId === venueFilter) &&
          (year === "all" || e.date.startsWith(year)) &&
          (!search ||
            [e.beer, e.brewery, e.style, e.notes, v?.name, v?.city, v?.country]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase()))
        );
      }),
    [entries, places, country, city, venueFilter, year, search],
  );
  const summary = stats(filtered, places),
    allStats = stats(entries, places),
    countries = Array.from(
      new Set(
        entries
          .map((e) => places.find((v) => v.id === e.venueId)?.countryCode)
          .filter(Boolean),
      ),
    ) as string[];
  const years = Array.from(new Set(entries.map((e) => e.date.slice(0, 4))))
    .sort()
    .reverse();
  const mapVenues: MapVenue[] = places
    .filter((v) => filtered.some((e) => e.venueId === v.id))
    .map((v) => ({
      ...v,
      experiences: filtered.filter((e) => e.venueId === v.id).length,
    }));
  const activeVenue =
    places.find((v) => v.id === selectedVenue) ||
    (demo ? exampleVenues : explore).find((v) => v.id === selectedVenue);
  const displayName = user?.name?.split(" ")[0] || "Kirky";
  function startLog(e?: Experience) {
    const editable = e ? (({id, photo, ...rest}) => rest)(e) : {};
    setEditing(e?.id || null);
    setDraft(
      e
        ? {
            ...emptyDraft(),
            ...editable,
            abv: e.abv === null ? "" : String(e.abv),
            rating: e.rating === null ? "" : String(e.rating),
            date: e.date.slice(0, 16),
            price: e.price === null ? "" : String(e.price),
            venueRating: e.venueRating === null ? "" : String(e.venueRating),
            pourRating: e.pourRating === null ? "" : String(e.pourRating),
            priceRating: e.priceRating === null ? "" : String(e.priceRating),
            photoId: e.photo?.startsWith("/api/photos/")
              ? e.photo.split("/").pop()!
              : null,
          }
        : emptyDraft(),
    );
    setPhoto(e?.photo || null);
    setPhotoBlob(null);
    setMore(!!e);
    setDetail(null);
    setLog(true);
    setVenueOptions(demo ? exampleVenues : places);
  }
  async function venueSearch(value: string) {
    if (demo) return;
    try {
      const d = await api("venues?q=" + encodeURIComponent(value));
      setVenueOptions(d.venues);
    } catch {
      toast.error(
        "Could not search places. Your previous venues are still available.",
      );
    }
  }
  async function choosePhoto(file: File) {
    try {
      if (file.size > 15000000) throw new Error("Choose a photo under 15 MB.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Choose a JPEG, PNG or WebP photo.");
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const c = canvas.getContext("2d")!;
      c.fillStyle = "#fff";
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, "image/jpeg", 0.82),
      );
      if (!blob || blob.size > 2000000)
        throw new Error("Photo is too large. Choose a smaller image.");
      if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
      setPhoto(URL.createObjectURL(blob));
      setPhotoBlob(blob);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (demo) {
      setSign(true);
      return;
    }
    setBusy(true);
    try {
      let photoId = draft.photoId;
      if (photoBlob) {
        const p = await api("photos", {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: photoBlob,
        });
        photoId = p.id;
        setDraft((d) => ({ ...d, photoId: p.id }));
        setPhotoBlob(null);
      }
      const numeric = (s: string) => (s === "" ? null : Number(s));
      const data = {
        ...draft,
        rating: numeric(draft.rating),
        abv: numeric(draft.abv),
        price: numeric(draft.price),
        venueRating: numeric(draft.venueRating),
        pourRating: numeric(draft.pourRating),
        priceRating: numeric(draft.priceRating),
        photoId,
      };
      await api(editing ? "experiences/" + editing : "experiences", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await refresh();
      setLog(false);
      toast.success(
        editing ? "Memory updated." : "Another memory in your passport.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function createVenue(e: React.FormEvent) {
    e.preventDefault();
    if (demo) {
      setSign(true);
      return;
    }
    setBusy(true);
    try {
      const d = await api("venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newVenue,
          lat: Number(newVenue.lat),
          lng: Number(newVenue.lng),
        }),
      });
      setVenueOptions((v) => [d.venue, ...v]);
      setPlaces((v) => [d.venue, ...v]);
      setDraft((draft) => ({ ...draft, venueId: d.venue.id }));
      setAddVenue(false);
      toast.success(
        "Place added. It will be reviewed before appearing on Explore.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      if (demo) {
        setConfirm(null);
        setSign(true);
        return;
      }
      if (confirm === "account") {
        await api("account", { method: "DELETE" });
        location.reload();
      } else {
        await api("experiences/" + detail!.id, { method: "DELETE" });
        await refresh();
        setDetail(null);
        toast.success("Memory deleted.");
      }
      setConfirm(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openShare(e?: Experience) {
    setShareEntry(e || null);
    setShare(true);
  }
  async function downloadCard() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#183d35";
    c.fillRect(0, 0, 1080, 1920);
    c.strokeStyle = "#bb995e";
    c.lineWidth = 3;
    c.strokeRect(55, 55, 970, 1810);
    c.fillStyle = "#f4c66a";
    c.font = "28px sans-serif";
    c.fillText("BEER PASSPORT", 90, 130);
    let y = 230;
    if (shareEntry?.photo) {
      try {
        const image = new Image();
        image.src = shareEntry.photo;
        await image.decode();
        const scale = Math.max(900 / image.width, 800 / image.height);
        c.save();
        c.beginPath();
        c.rect(90, 210, 900, 800);
        c.clip();
        c.drawImage(
          image,
          90 + (900 - image.width * scale) / 2,
          210 + (800 - image.height * scale) / 2,
          image.width * scale,
          image.height * scale,
        );
        c.restore();
        y = 1110;
      } catch {}
    }
    c.fillStyle = "#faf7ee";
    c.font = "bold 72px Georgia";
    const title = shareEntry ? shareEntry.beer : displayName + "’s passport";
    const words = title.split(" ");
    let line = "";
    for (const word of words) {
      if (c.measureText(line + word).width > 880) {
        c.fillText(line, 90, y);
        y += 90;
        line = "";
      }
      line += word + " ";
    }
    c.fillText(line, 90, y);
    y += 110;
    c.font = "36px sans-serif";
    if (shareEntry) {
      const v = places.find((v) => v.id === shareEntry.venueId);
      for (const text of [
        v?.name || "",
        `${v?.city} · ${v?.country}`,
        dateText(shareEntry.date),
        shareEntry.rating !== null ? `${shareEntry.rating}/10` : "",
      ]) {
        c.fillText(text, 90, y, 880);
        y += 65;
      }
    } else {
      for (const text of [
        `${allStats.experiences} memories`,
        `${allStats.countries} countries`,
        `${allStats.venues} places`,
        `${allStats.beers} unique beers`,
      ]) {
        c.fillText(text, 90, y);
        y += 85;
      }
    }
    c.fillStyle = "#f4c66a";
    c.font = "28px sans-serif";
    c.fillText("Remember where you drank it.", 90, 1770);
    c.font = "24px sans-serif";
    c.fillText(
      "Made with Beer Passport" + (demo ? " · SAMPLE PASSPORT" : ""),
      90,
      1815,
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a"),
        url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "beer-passport.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }
  const experienceCard = (e: Experience) => {
    const v = places.find((v) => v.id === e.venueId);
    return (
      <button
        className={"memory-card " + (!e.photo ? "text-memory" : "")}
        key={e.id}
        onClick={() => setDetail(e)}
      >
        {e.photo ? (
          <div className="memory-photo">
            <img src={e.photo} alt={`${e.beer} travel memory`} loading="lazy" />
            <span className="photo-country">
              {flag(v?.countryCode || "GB")} {v?.country}
            </span>
            {e.rating !== null && (
              <span className="photo-score">
                <Star size={13} fill="currentColor" />
                {e.rating}
              </span>
            )}
          </div>
        ) : (
          <div className="memory-no-photo">
            <Beer size={36} />
            <span>
              {flag(v?.countryCode || "GB")} {v?.country}
            </span>
            <span className="score-small">
              {e.rating === null ? "Unrated" : e.rating + "/10"}
            </span>
          </div>
        )}
        <div className="memory-copy">
          <small>{dateText(e.date)}</small>
          <h3>{e.beer}</h3>
          <p>
            <MapPin size={14} />
            {v?.name}
          </p>
          <span>
            {v?.city} · {e.style}
          </span>
        </div>
      </button>
    );
  };
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "248px" } as React.CSSProperties}
    >
      <Sidebar className="passport-sidebar">
        <SidebarHeader>
          <button className="brand" onClick={() => navigate("passport")}>
            <span className="brand-icon">
              <BookOpen size={25} />
            </span>
            <span>
              BEER
              <br />
              PASSPORT<span className="brand-caption">A WORLD OF MEMORIES</span>
            </span>
          </button>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-label">YOUR JOURNEY</div>
          <SidebarMenu>
            {navigation.map((n) => (
              <SidebarMenuItem key={n.id}>
                <SidebarMenuButton
                  isActive={view === n.id}
                  onClick={() => navigate(n.id)}
                >
                  <n.icon size={19} />
                  <span>{n.name}</span>
                  {n.id === "explore" && (
                    <span className="new-label">WORLD</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="sidebar-note">
            <Stamp size={27} />
            <p>
              Good beers.
              <br />
              Better memories.
            </p>
            <span>Every pint has a place.</span>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <button
            className="settings-link"
            onClick={() => navigate("settings")}
          >
            <Settings size={18} />
            Settings & privacy
          </button>
          <button
            className="profile"
            onClick={() => (demo ? setSign(true) : navigate("settings"))}
          >
            <span className="avatar">{displayName.slice(0, 1)}</span>
            <span>
              <strong>{demo ? "Kirky’s sample passport" : user?.name}</strong>
              <small>{demo ? "Take a look around" : "Personal passport"}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </SidebarFooter>
      </Sidebar>
      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-menu" />
            <span>Your journey</span>
            <ChevronRight size={14} />
            <strong>
              {view === "settings"
                ? "Settings"
                : navigation.find((n) => n.id === view)?.name}
            </strong>
          </div>
          <div className="top-actions">
            <span className="private-label">
              <Lock size={13} />
              {demo ? "Sample account" : "Private passport"}
            </span>
            <button
              className="icon-button"
              aria-label="Search your journal"
              onClick={() => {
                navigate("journal");
                setTimeout(
                  () => document.getElementById("journal-search")?.focus(),
                  30,
                );
              }}
            >
              <Search size={20} />
            </button>
            <button
              className="avatar small"
              aria-label="Your account"
              onClick={() => (demo ? setSign(true) : navigate("settings"))}
            >
              {displayName.slice(0, 1)}
            </button>
          </div>
        </header>
        <div className="page-content">
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={() => location.reload()}>Retry</button>
            </div>
          )}
          {demo && (
            <div className="demo-banner">
              <span>
                <Compass size={16} />
                You’re exploring a sample passport. These are example memories.
              </span>
              <button onClick={() => setSign(true)}>
                Create your passport <ChevronRight size={14} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {view === "explore"
                  ? "THE WORLD, ONE PINT AT A TIME"
                  : view === "passport"
                    ? "COLLECT PLACES. KEEP THE MEMORIES."
                    : view === "settings"
                      ? "MAKE IT YOURS"
                      : "YOUR BEER PASSPORT"}
              </div>
              <h1>
                {view === "passport"
                  ? "Your passport to good memories."
                  : view === "journal"
                    ? "The pints. The places. The stories."
                    : view === "map"
                      ? "Your world, mapped."
                      : view === "explore"
                        ? "There’s a whole world out there."
                        : view === "stats"
                          ? "A little perspective on your pints."
                          : "Your passport. Your privacy."}
              </h1>
              <p>
                {view === "passport"
                  ? "A growing collection of everywhere you’ve raised a glass."
                  : view === "journal"
                    ? "The beer is only half the story."
                    : view === "map"
                      ? "Every pin is a place you chose to remember."
                      : view === "explore"
                        ? "Discover places through the beers enjoyed there."
                        : view === "stats"
                          ? "The numbers behind your memories."
                          : "Keep your memories on your terms."}
              </p>
            </div>
            <button className="btn primary" onClick={() => startLog()}>
              <Plus size={19} />
              Log a pint
            </button>
          </div>
          {view !== "settings" && view !== "explore" && (
            <div className="stats-strip">
              {[
                { n: summary.experiences, label: "Experiences", icon: Beer },
                { n: summary.countries, label: "Countries", icon: Globe2 },
                { n: summary.cities, label: "Cities & towns", icon: MapPin },
                { n: summary.venues, label: "Venues", icon: Compass },
                { n: summary.beers, label: "Unique beers", icon: BookOpen },
              ].map((s) => (
                <div className="stat" key={s.label}>
                  <s.icon size={20} />
                  <div>
                    <strong>{s.n}</strong>
                    <span>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {view === "passport" && (
            <>
              <div className="passport-grid">
                <section className="countries-section">
                  <div className="section-heading">
                    <h2>
                      {country === "all"
                        ? "Your passport pages"
                        : places.find((v) => v.countryCode === country)
                            ?.country}
                    </h2>
                    <span>
                      {country === "all" ? (
                        `${allStats.countries} countries collected`
                      ) : (
                        <button onClick={resetFilters}>All countries</button>
                      )}
                    </span>
                  </div>
                  {country === "all" ? (
                    <div className="country-grid">
                      {countries.length ? (
                        countries.map((code, i) => {
                          const v = places.find((v) => v.countryCode === code)!,
                            es = filtered.filter(
                              (e) =>
                                places.find((p) => p.id === e.venueId)
                                  ?.countryCode === code,
                            ),
                            vs = new Set(es.map((e) => e.venueId)),
                            cities = new Set(
                              places
                                .filter((p) => vs.has(p.id))
                                .map((p) => p.city),
                            );
                          return (
                            <button
                              className={"country-card country-" + (i % 3)}
                              key={code}
                              onClick={() => {
                                setCountry(code);
                                setCity("all");
                                setVenueFilter("all");
                              }}
                            >
                              <div className="country-top">
                                <span className="flag-large">{flag(code)}</span>
                                <span className="country-code">
                                  {code} · PASSPORT PAGE
                                </span>
                                <ChevronRight size={17} />
                              </div>
                              <div className="stamp">
                                <span>BEER PASSPORT</span>
                                <strong>
                                  {code === "GB"
                                    ? "UNITED KINGDOM"
                                    : v.country.toUpperCase()}
                                </strong>
                                <span>
                                  {es.length
                                    ? new Date(es[0].date).getFullYear()
                                    : "2026"}{" "}
                                  · MEMORIES COLLECTED
                                </span>
                              </div>
                              <div className="country-details">
                                <h3>{v.country}</h3>
                                <p>
                                  {es.length} experiences <b>·</b> {vs.size}{" "}
                                  venues
                                </p>
                                <span>
                                  {cities.size}{" "}
                                  {cities.size === 1
                                    ? "city"
                                    : "cities & towns"}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="empty-state">
                          <BookOpen />
                          <h3>Your first page is waiting.</h3>
                          <p>Log a pint to add a country to your passport.</p>
                          <button
                            className="btn primary"
                            onClick={() => startLog()}
                          >
                            Log your first pint
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="drilldown">
                      <div className="drill-breadcrumb">
                        <button onClick={resetFilters}>World</button>
                        <ChevronRight size={13} />
                        <button
                          onClick={() => {
                            setCity("all");
                            setVenueFilter("all");
                          }}
                        >
                          {
                            places.find((v) => v.countryCode === country)
                              ?.country
                          }
                        </button>
                        {city !== "all" && (
                          <>
                            <ChevronRight size={13} />
                            <button onClick={() => setVenueFilter("all")}>
                              {city}
                            </button>
                          </>
                        )}
                        {venueFilter !== "all" && (
                          <>
                            <ChevronRight size={13} />
                            {places.find((v) => v.id === venueFilter)?.name}
                          </>
                        )}
                      </div>
                      {city === "all" ? (
                        Array.from(new Set(mapVenues.map((v) => v.city))).map(
                          (c) => (
                            <button
                              className="place-row"
                              key={c}
                              onClick={() => setCity(c)}
                            >
                              <span className="place-icon">
                                <MapPin />
                              </span>
                              <div>
                                <strong>{c}</strong>
                                <small>
                                  {mapVenues.filter((v) => v.city === c).length}{" "}
                                  venues ·{" "}
                                  {
                                    filtered.filter(
                                      (e) =>
                                        places.find((v) => v.id === e.venueId)
                                          ?.city === c,
                                    ).length
                                  }{" "}
                                  memories
                                </small>
                              </div>
                              <ChevronRight />
                            </button>
                          ),
                        )
                      ) : venueFilter === "all" ? (
                        mapVenues.map((v) => (
                          <button
                            className="place-row"
                            key={v.id}
                            onClick={() => setVenueFilter(v.id)}
                          >
                            <span className="place-icon">
                              <Beer />
                            </span>
                            <div>
                              <strong>{v.name}</strong>
                              <small>{v.experiences} memories</small>
                            </div>
                            <ChevronRight />
                          </button>
                        ))
                      ) : (
                        <div className="journal-grid">
                          {filtered.map(experienceCard)}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="passport-foot">
                    <Lock size={14} />
                    <span>
                      Your passport is private. You choose what to share.
                    </span>
                  </div>
                </section>
                <section className="world-section">
                  <div className="section-heading">
                    <h2>A world of your own</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("map")}
                    >
                      Open map <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <PassportMap
                    venues={mapVenues}
                    compact
                    onSelect={setSelectedVenue}
                  />
                  <div className="map-summary">
                    <span>
                      <i />
                      {summary.venues} places worth remembering
                    </span>
                    <strong>
                      {summary.countries}{" "}
                      {summary.countries === 1 ? "country" : "countries"}
                    </strong>
                  </div>
                  <div className="passport-quote">
                    <span>FIELD NOTES / 001</span>
                    <p>
                      “Don’t just remember what you drank.
                      <br />
                      <em>Remember where you drank it.</em>”
                    </p>
                    <button onClick={() => openShare()}>
                      <Share2 size={16} />
                      Share your passport
                    </button>
                  </div>
                </section>
              </div>
              <section className="recent-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">A FEW PAGES FROM YOUR STORY</span>
                    <h2>Recent memories</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("journal")}
                  >
                    View journal <ChevronRight size={15} />
                  </button>
                </div>
                <div className="recent-grid">
                  {filtered.slice(0, 3).map(experienceCard)}
                  {!filtered.length && (
                    <p className="muted">
                      Your next pint could be your first memory.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
          {(view === "journal" || view === "map") && (
            <>
              <div className="filters">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    id="journal-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search beers, places and memories…"
                    aria-label="Search journal"
                  />
                </div>
                <Select
                  value={country}
                  onValueChange={(v) => {
                    setCountry(v);
                    setCity("all");
                    setVenueFilter("all");
                  }}
                >
                  <SelectTrigger aria-label="Filter country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {flag(c)}{" "}
                        {places.find((v) => v.countryCode === c)?.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger aria-label="Filter year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    {years.map((y) => (
                      <SelectItem value={y} key={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {view === "journal" ? (
                <>
                  <div className="section-heading">
                    <h2>{filtered.length} memories</h2>
                    <button className="text-button" onClick={() => openShare()}>
                      <Share2 size={15} />
                      Share passport
                    </button>
                  </div>
                  <div className="journal-grid">
                    {filtered.map(experienceCard)}
                  </div>
                </>
              ) : (
                <>
                  <PassportMap venues={mapVenues} onSelect={setSelectedVenue} />
                  <div className="section-heading below-map">
                    <h2>Your places</h2>
                    <span>{mapVenues.length} venues</span>
                  </div>
                  <div className="venue-list">
                    {mapVenues.map((v) => (
                      <button
                        className="place-row"
                        key={v.id}
                        onClick={() => setSelectedVenue(v.id)}
                      >
                        <span className="place-icon">
                          {flag(v.countryCode)}
                        </span>
                        <div>
                          <strong>{v.name}</strong>
                          <small>
                            {v.city} · {v.experiences} memories
                          </small>
                        </div>
                        <ChevronRight />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {!filtered.length && (
                <div className="empty-state">
                  <Beer />
                  <h3>
                    {entries.length
                      ? "No memories match those filters."
                      : "Your journal starts here."}
                  </h3>
                  <p>
                    {entries.length
                      ? "Try another country, year or search."
                      : "Log a beer somewhere worth remembering."}
                  </p>
                  <button
                    className="btn outline"
                    onClick={() =>
                      entries.length ? resetFilters() : startLog()
                    }
                  >
                    {entries.length ? "Clear filters" : "Log a pint"}
                  </button>
                </div>
              )}
            </>
          )}
          {view === "explore" && (
            <>
              <div className="explore-head">
                <Tabs defaultValue="world">
                  <TabsList>
                    <TabsTrigger value="world">
                      <Globe2 size={16} />
                      Global map
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <span className="muted">
                  <Lock size={14} />
                  Places, not people. No live activity.
                </span>
              </div>
              <PassportMap
                venues={
                  demo
                    ? exampleVenues.map((v) => ({
                        ...v,
                        experiences: examples.filter((e) => e.venueId === v.id)
                          .length,
                      }))
                    : explore
                }
                onSelect={setSelectedVenue}
              />
              <div className="section-heading below-map">
                <h2>
                  {demo
                    ? "Sample places to explore"
                    : "Places on the global map"}
                </h2>
                <span>
                  {demo ? "Example data" : "Opt-in contributions only"}
                </span>
              </div>
              <div className="venue-list">
                {(demo
                  ? exampleVenues.map((v) => ({
                      ...v,
                      experiences: examples.filter((e) => e.venueId === v.id)
                        .length,
                    }))
                  : explore
                ).map((v) => (
                  <button
                    key={v.id}
                    className="place-row"
                    onClick={() => setSelectedVenue(v.id)}
                  >
                    <span className="place-icon">{flag(v.countryCode)}</span>
                    <div>
                      <strong>{v.name}</strong>
                      <small>
                        {v.city} · {v.country}
                      </small>
                    </div>
                    <span className="venue-count">
                      {v.experiences} experiences
                    </span>
                    <ChevronRight />
                  </button>
                ))}
              </div>
              {!demo && !explore.length && (
                <div className="empty-state">
                  <Globe2 />
                  <h3>The global map is just getting started.</h3>
                  <p>
                    A verified public venue appears once at least five people
                    have chosen to contribute. Entries from the last seven days
                    are excluded.
                  </p>
                </div>
              )}
              <div className="info-note">
                <Lock size={19} />
                <p>
                  Personal notes, photos, usernames and visit times never appear
                  here. Your memories are excluded unless you choose to
                  contribute an experience.
                </p>
              </div>
            </>
          )}
          {view === "stats" && (
            <>
              <div className="insights-grid">
                <section className="insight feature-insight">
                  <span className="eyebrow">YOUR TOP RATED MEMORY</span>
                  {filtered.length ? (
                    <>
                      <Star size={32} />
                      <h2>
                        {
                          [...filtered].sort(
                            (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
                          )[0].beer
                        }
                      </h2>
                      <p>
                        {
                          places.find(
                            (v) =>
                              v.id ===
                              [...filtered].sort(
                                (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
                              )[0].venueId,
                          )?.name
                        }
                      </p>
                      <strong>
                        {Math.max(...filtered.map((e) => e.rating ?? 0))}/10
                      </strong>
                    </>
                  ) : (
                    <p>Log a rated beer to find your favourite.</p>
                  )}
                </section>
                <section className="insight">
                  <span className="eyebrow">YOUR BEER STYLES</span>
                  <h2>A taste for exploration.</h2>
                  {Array.from(new Set(filtered.map((e) => e.style))).map(
                    (s) => (
                      <div className="style-row" key={s}>
                        <div>
                          <span>{s}</span>
                          <strong>
                            {filtered.filter((e) => e.style === s).length}
                          </strong>
                        </div>
                        <div className="bar">
                          <i
                            style={{
                              width:
                                (100 *
                                  filtered.filter((e) => e.style === s)
                                    .length) /
                                  Math.max(1, filtered.length) +
                                "%",
                            }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </section>
                <section className="insight">
                  <span className="eyebrow">THE SMALL DETAILS</span>
                  <div className="insight-number">
                    <strong>
                      {summary.average === null
                        ? "—"
                        : summary.average.toFixed(1)}
                      <small>/10</small>
                    </strong>
                    <span>Average experience rating</span>
                  </div>
                  <div className="insight-number">
                    <strong>
                      {
                        new Set(
                          filtered
                            .filter((e) => e.brewery)
                            .map((e) => e.brewery),
                        ).size
                      }
                    </strong>
                    <span>Breweries explored</span>
                  </div>
                </section>
              </div>
              <div className="section-heading">
                <h2>The price of a memory</h2>
                <span>Currencies stay separate</span>
              </div>
              <div className="price-grid">
                {Array.from(
                  new Set(
                    filtered
                      .filter((e) => e.price !== null)
                      .map((e) => e.currency),
                  ),
                ).map((c) => {
                  const list = filtered.filter(
                    (e) => e.currency === c && e.price !== null,
                  );
                  return (
                    <div className="insight" key={c}>
                      <span className="eyebrow">{c}</span>
                      <h2>
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: c,
                        }).format(
                          list.reduce((a, e) => a + e.price!, 0) / list.length,
                        )}
                      </h2>
                      <p>Average paid · {list.length} logged prices</p>
                      <div className="price-range">
                        <span>
                          Lowest{" "}
                          {Math.min(...list.map((e) => e.price!)).toFixed(2)}
                        </span>
                        <span>
                          Highest{" "}
                          {Math.max(...list.map((e) => e.price!)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {view === "settings" && (
            <div className="settings-grid">
              <section className="settings-panel">
                <h2>Your account</h2>
                <div className="account-preview">
                  <span className="avatar">{displayName.slice(0, 1)}</span>
                  <div>
                    <strong>
                      {demo ? "Exploring a sample passport" : user?.name}
                    </strong>
                    <p>
                      {demo
                        ? "Your own story starts with an account."
                        : "Your account is managed through Microsoft Entra."}
                    </p>
                  </div>
                </div>
                {demo ? (
                  <button className="btn primary" onClick={() => setSign(true)}>
                    Create your passport
                  </button>
                ) : (
                  <button
                    className="btn outline"
                    onClick={async () => {
                      try {
                        await api("auth/logout", { method: "POST" });
                        location.reload();
                      } catch {
                        toast.error("Could not sign out. Please try again.");
                      }
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                )}
                <hr />
                <h2>Privacy comes first.</h2>
                <div className="privacy-row">
                  <Lock />
                  <div>
                    <strong>Private by default</strong>
                    <p>
                      Your notes, photographs and visit dates are only visible
                      to you.
                    </p>
                  </div>
                </div>
                <div className="privacy-row">
                  <Globe2 />
                  <div>
                    <strong>Your choice to contribute</strong>
                    <p>
                      Each experience has a separate opt-in for anonymous venue
                      totals. No current or live location is shared.
                    </p>
                  </div>
                </div>
                <div className="privacy-row">
                  <Camera />
                  <div>
                    <strong>Photos without location metadata</strong>
                    <p>
                      Photos are resized and stripped of metadata before upload.
                    </p>
                  </div>
                </div>
              </section>
              <section className="settings-panel">
                <h2>Your memories belong to you.</h2>
                <p>
                  Export your journal and venue records as a portable JSON file.
                  Photos can be downloaded individually from each memory.
                </p>
                <button
                  className="btn outline"
                  onClick={() =>
                    demo ? setSign(true) : window.open("/api/export", "_blank")
                  }
                >
                  <Download size={17} />
                  Export my journal
                </button>
                <hr />
                <h2>Delete your passport</h2>
                <p>
                  Remove your Beer Passport profile, experiences and photos.
                  This also ends your sessions. Your Entra identity is managed
                  separately.
                </p>
                <button
                  className="btn danger"
                  onClick={() => (demo ? setSign(true) : setConfirm("account"))}
                >
                  <Trash2 size={16} />
                  Delete my passport
                </button>
                <hr />
                <span className="eyebrow">PHOTO CREDITS</span>
                <p className="credits">
                  Sample imagery:{" "}
                  <a
                    href="https://www.pexels.com/photo/people-holding-beer-glasses-and-french-fries-on-the-table-21952119/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Tugay Kocatürk
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://www.pexels.com/photo/hand-holding-glass-of-beer-on-the-beach-4996691/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Kaboompics
                  </a>{" "}
                  / Pexels. Sample records illustrate the product; they are not
                  imported personal reviews.
                </p>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              <BookOpen size={14} /> BEER PASSPORT
            </span>
            <span>Made for the memories. Enjoy responsibly.</span>
            <span>
              {loading
                ? "Connecting…"
                : demo
                  ? "Sample passport"
                  : "Private journal"}
            </span>
          </footer>
        </div>
      </main>
      <nav className="mobile-bottom">
        {navigation
          .filter((n) => n.id !== "stats")
          .map((n) => (
            <button
              className={view === n.id ? "active" : ""}
              onClick={() => navigate(n.id)}
              key={n.id}
            >
              <n.icon size={20} />
              <span>
                {n.id === "passport"
                  ? "Passport"
                  : n.id === "journal"
                    ? "Journal"
                    : n.id === "map"
                      ? "My map"
                      : "Explore"}
              </span>
            </button>
          ))}
        <button onClick={() => startLog()}>
          <Plus size={21} />
          <span>Log</span>
        </button>
      </nav>
      <Dialog open={log} onOpenChange={setLog}>
        <DialogContent className="log-dialog">
          <DialogTitle>
            {editing ? "Edit your memory" : "A pint worth remembering."}
          </DialogTitle>
          <DialogDescription>
            Beer, place, memory. Everything else can wait.
          </DialogDescription>
          <form onSubmit={save} className="log-form">
            <label className={"photo-upload " + (photo ? "has-photo" : "")}>
              {photo ? (
                <img src={photo} alt="Selected memory" />
              ) : (
                <>
                  <Camera size={26} />
                  <strong>Add a photo</strong>
                  <span>Optional. Sometimes a picture says it all.</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  e.target.files?.[0] && choosePhoto(e.target.files[0])
                }
              />
            </label>
            <div className="two-fields">
              <label>
                Beer
                <input
                  required
                  maxLength={120}
                  value={draft.beer}
                  onChange={(e) => setDraft({ ...draft, beer: e.target.value })}
                  placeholder="What’s in your glass?"
                  list="previous-beers"
                />
                <datalist id="previous-beers">
                  {Array.from(new Set(entries.map((e) => e.beer))).map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>
              <label>
                Rating <span className="muted">/ 10 · optional</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={draft.rating}
                  onChange={(e) =>
                    setDraft({ ...draft, rating: e.target.value })
                  }
                  placeholder="How was it?"
                />
              </label>
            </div>
            <label>
              Where did you drink it?
              <Combobox
                items={venueOptions}
                value={venueOptions.find((v) => v.id === draft.venueId) || null}
                itemToStringLabel={(v) => (v ? `${v.name} · ${v.city}` : "")}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, venueId: v?.id || "" }))
                }
                onInputValueChange={(v) => venueSearch(v)}
              >
                <ComboboxInput
                  placeholder="Search a venue or choose a previous place"
                  aria-label="Choose venue"
                />
                <ComboboxContent>
                  <ComboboxEmpty>No places found.</ComboboxEmpty>
                  <ComboboxList>
                    {(v: Venue) => (
                      <ComboboxItem key={v.id} value={v}>
                        <MapPin size={15} />
                        <span>
                          {v.name}
                          <small className="venue-option-sub">
                            {v.city} · {v.country}
                          </small>
                        </span>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </label>
            <button
              type="button"
              className="text-button add-place"
              onClick={() => setAddVenue(true)}
            >
              <Plus size={14} />
              Can’t find your place? Add it
            </button>
            <label>
              Date & time
              <input
                type="datetime-local"
                required
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </label>
            <label>
              A note for future you
              <textarea
                maxLength={3000}
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="The sunset. The company. The first sip…"
              />
            </label>
            <div className="switch-row">
              <span>Would drink again</span>
              <Switch
                aria-label="Would drink again" checked={draft.drinkAgain}
                onCheckedChange={(v) => setDraft({ ...draft, drinkAgain: v })}
              />
            </div>
            <button
              type="button"
              className="more-details"
              onClick={() => setMore(!more)}
            >
              <SlidersHorizontal size={16} />
              {more ? "Hide extra details" : "Add price, brewery & venue notes"}
              <ChevronRight size={15} />
            </button>
            {more && (
              <>
                <div className="two-fields">
                  <label>
                    Brewery
                    <input
                      value={draft.brewery}
                      onChange={(e) =>
                        setDraft({ ...draft, brewery: e.target.value })
                      }
                      maxLength={120}
                    />
                  </label>
                  <label>
                    Style
                    <input
                      value={draft.style}
                      onChange={(e) =>
                        setDraft({ ...draft, style: e.target.value })
                      }
                      maxLength={60}
                    />
                  </label>
                </div>
                <div className="two-fields">
                  <label>
                    ABV %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={draft.abv}
                      onChange={(e) =>
                        setDraft({ ...draft, abv: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Price paid
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.price}
                      onChange={(e) =>
                        setDraft({ ...draft, price: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  Currency
                  <Select
                    value={draft.currency}
                    onValueChange={(v) => setDraft({ ...draft, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["GBP", "EUR", "USD", "TRY", "CAD", "AUD"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <div className="three-fields">
                  {(["venueRating", "pourRating", "priceRating"] as const).map(
                    (k) => (
                      <label key={k}>
                        {k === "venueRating"
                          ? "Venue"
                          : k === "pourRating"
                            ? "Pour"
                            : "Value"}{" "}
                        / 10
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          value={draft[k]}
                          onChange={(e) =>
                            setDraft({ ...draft, [k]: e.target.value })
                          }
                        />
                      </label>
                    ),
                  )}
                </div>
                <label>
                  Venue notes
                  <textarea
                    maxLength={3000}
                    value={draft.venueNotes}
                    onChange={(e) =>
                      setDraft({ ...draft, venueNotes: e.target.value })
                    }
                  />
                </label>
                <div className="switch-row">
                  <span>Would return to this venue</span>
                  <Switch
                    aria-label="Would return to venue" checked={draft.wouldReturn}
                    onCheckedChange={(v) =>
                      setDraft({ ...draft, wouldReturn: v })
                    }
                  />
                </div>
              </>
            )}
            <div className="contribute-box">
              <div>
                <Globe2 size={18} />
                <span>
                  <strong>Contribute to the global map</strong>
                  <small>
                    Anonymous venue totals only. Your memory stays private.
                  </small>
                </span>
              </div>
              <Switch
                aria-label="Contribute anonymous venue totals" checked={draft.contribute}
                onCheckedChange={(v) => setDraft({ ...draft, contribute: v })}
              />
            </div>
            <button
              className="btn primary full"
              type="submit"
              disabled={busy || !draft.beer || !draft.venueId}
            >
              {busy
                ? "Saving your memory…"
                : demo
                  ? "Sign in to save this memory"
                  : editing
                    ? "Save changes"
                    : "Save to my passport"}
              <Check size={18} />
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={addVenue} onOpenChange={setAddVenue}>
        <DialogContent>
          <DialogTitle>Add a missing place</DialogTitle>
          <DialogDescription>
            Use the venue’s map location, never your home or current device
            coordinates.
          </DialogDescription>
          <form className="log-form" onSubmit={createVenue}>
            <label>
              Venue name
              <input
                required
                maxLength={120}
                value={newVenue.name}
                onChange={(e) =>
                  setNewVenue({ ...newVenue, name: e.target.value })
                }
              />
            </label>
            <div className="two-fields">
              <label>
                City or town
                <input
                  required
                  value={newVenue.city}
                  onChange={(e) =>
                    setNewVenue({ ...newVenue, city: e.target.value })
                  }
                />
              </label>
              <label>
                Country code
                <input
                  required
                  maxLength={2}
                  pattern="[A-Z]{2}"
                  placeholder="GB / TR / PT"
                  value={newVenue.countryCode}
                  onChange={(e) =>
                    setNewVenue({
                      ...newVenue,
                      countryCode: e.target.value.toUpperCase(),
                    })
                  }
                />
              </label>
            </div>
            <div className="two-fields">
              <label>
                Venue latitude
                <input
                  required
                  type="number"
                  step="any"
                  min="-85"
                  max="85"
                  value={newVenue.lat}
                  onChange={(e) =>
                    setNewVenue({ ...newVenue, lat: e.target.value })
                  }
                />
              </label>
              <label>
                Venue longitude
                <input
                  required
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={newVenue.lng}
                  onChange={(e) =>
                    setNewVenue({ ...newVenue, lng: e.target.value })
                  }
                />
              </label>
            </div>
            <p className="muted">
              We check nearby venues before adding a new place. New places
              remain private until reviewed.
            </p>
            <button className="btn primary full" disabled={busy}>
              Add place
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Sheet
        open={!!detail || !!selectedVenue}
        onOpenChange={(v) => {
          if (!v) {
            setDetail(null);
            setSelectedVenue(null);
          }
        }}
      >
        <SheetContent className="detail-sheet">
          {detail ? (
            <>
              <SheetTitle>{detail.beer}</SheetTitle>
              <SheetDescription>
                {places.find((v) => v.id === detail.venueId)?.name} ·{" "}
                {places.find((v) => v.id === detail.venueId)?.city}
              </SheetDescription>
              {detail.photo && (
                <img
                  className="detail-photo"
                  src={detail.photo}
                  alt={detail.beer}
                />
              )}
              <div className="detail-tags">
                <span>
                  <Calendar size={15} />
                  {dateText(detail.date)}
                </span>
                <span>
                  <Star size={15} />
                  {detail.rating === null ? "Unrated" : detail.rating + "/10"}
                </span>
              </div>
              <h3>The memory</h3>
              <p className="detail-notes">
                {detail.notes || "Some memories don’t need words."}
              </p>
              <div className="detail-data">
                <div>
                  <small>Brewery</small>
                  <strong>{detail.brewery || "Not added"}</strong>
                </div>
                <div>
                  <small>Style</small>
                  <strong>{detail.style || "Not added"}</strong>
                </div>
                <div>
                  <small>Price</small>
                  <strong>
                    {detail.price === null
                      ? "Not added"
                      : new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: detail.currency,
                        }).format(detail.price)}
                  </strong>
                </div>
                <div>
                  <small>Drink again?</small>
                  <strong>
                    {detail.drinkAgain ? "Absolutely" : "Maybe something else"}
                  </strong>
                </div>
                {(["venueRating", "pourRating", "priceRating"] as const).map(
                  (k) =>
                    detail[k] !== null && (
                      <div key={k}>
                        <small>
                          {k === "venueRating"
                            ? "Venue"
                            : k === "pourRating"
                              ? "Pour"
                              : "Value"}
                        </small>
                        <strong>{detail[k]}/10</strong>
                      </div>
                    ),
                )}
              </div>
              {detail.venueNotes && (
                <>
                  <h3>About the place</h3>
                  <p>{detail.venueNotes}</p>
                </>
              )}
              <div className="detail-actions">
                <button
                  className="btn primary"
                  onClick={() => openShare(detail)}
                >
                  <Share2 size={16} />
                  Share memory
                </button>
                <button
                  className="btn outline"
                  onClick={() => startLog(detail)}
                >
                  Edit
                </button>
                <button
                  className="icon-button"
                  aria-label="Delete memory"
                  onClick={() => setConfirm("entry")}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {detail.photo && (
                <a
                  className="text-button"
                  href={detail.photo}
                  download="beer-passport-memory.jpg"
                >
                  <Download size={15} />
                  Download photo
                </a>
              )}
              <span className="muted">
                <Lock size={13} />
                Private memory
              </span>
            </>
          ) : activeVenue ? (
            <>
              <SheetTitle>{activeVenue.name}</SheetTitle>
              <SheetDescription>
                {flag(activeVenue.countryCode)} {activeVenue.city} ·{" "}
                {activeVenue.country}
              </SheetDescription>
              <div className="venue-sheet-icon">
                <MapPin size={42} />
              </div>
              <div className="section-heading">
                <h3>
                  {view === "explore"
                    ? "Experiences at this place"
                    : "Your memories here"}
                </h3>
              </div>
              {view === "explore" && !demo ? (
                <>
                  <p>
                    {explore.find((v) => v.id === activeVenue.id)
                      ?.experiences || 0}{" "}
                    anonymous experiences
                  </p>
                  <p className="muted">
                    Personal notes, photos and visit times stay private.
                  </p>
                </>
              ) : (
                <div className="venue-memories">
                  {entries
                    .filter((e) => e.venueId === activeVenue.id)
                    .map((e) => (
                      <button
                        className="place-row"
                        key={e.id}
                        onClick={() => {
                          setSelectedVenue(null);
                          setDetail(e);
                        }}
                      >
                        <Beer size={21} />
                        <div>
                          <strong>{e.beer}</strong>
                          <small>{dateText(e.date)}</small>
                        </div>
                        <span>
                          {e.rating === null ? "—" : e.rating + "/10"}
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                </div>
              )}
              <a
                className="btn outline"
                href={`https://www.openstreetmap.org/?mlat=${activeVenue.lat}&mlon=${activeVenue.lng}#map=17/${activeVenue.lat}/${activeVenue.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation size={16} />
                View place on map
              </a>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <Dialog open={share} onOpenChange={setShare}>
        <DialogContent className="share-dialog">
          <DialogTitle>Good memories travel.</DialogTitle>
          <DialogDescription>
            Your downloadable card contains only the details shown below.
          </DialogDescription>
          <div className="share-preview">
            <span>
              <BookOpen size={16} />
              BEER PASSPORT
            </span>
            {shareEntry?.photo && (
              <img src={shareEntry.photo} alt="Memory to share" />
            )}
            <h2>
              {shareEntry ? shareEntry.beer : displayName + "’s passport"}
            </h2>
            {shareEntry ? (
              <>
                <p>{places.find((v) => v.id === shareEntry.venueId)?.name}</p>
                <p>
                  {places.find((v) => v.id === shareEntry.venueId)?.city} ·{" "}
                  {places.find((v) => v.id === shareEntry.venueId)?.country}
                </p>
                <strong>
                  {shareEntry.rating === null
                    ? "A memory worth keeping"
                    : shareEntry.rating + "/10"}
                </strong>
              </>
            ) : (
              <div className="share-numbers">
                <div>
                  <strong>{allStats.experiences}</strong>
                  <span>memories</span>
                </div>
                <div>
                  <strong>{allStats.countries}</strong>
                  <span>countries</span>
                </div>
                <div>
                  <strong>{allStats.venues}</strong>
                  <span>places</span>
                </div>
              </div>
            )}
            <small>
              Remember where you drank it.{demo ? " · SAMPLE PASSPORT" : ""}
            </small>
          </div>
          <button className="btn primary full" onClick={downloadCard}>
            <Download size={18} />
            Download story card
          </button>
          <p className="muted">
            1080 × 1920 · ready for Stories, WhatsApp and your camera roll.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={sign} onOpenChange={setSign}>
        <DialogContent className="signin-dialog">
          <BookOpen size={38} />
          <DialogTitle>Your next chapter starts here.</DialogTitle>
          <DialogDescription>
            A personal journal for your beers, places and memories. Private by
            default.
          </DialogDescription>
          {authReady ? (
            <a
              className="btn primary full"
              href="/api/auth/entra/start"
              target="_top"
            >
              Continue to sign in
            </a>
          ) : (
            <div className="signin-unavailable">
              <Lock size={20} />
              <strong>Accounts are coming soon.</strong>
              <p>
                Sign-in will open once Microsoft Entra is connected. You can
                explore the sample passport in the meantime.
              </p>
            </div>
          )}
          <span className="muted">
            Account access powered by Microsoft Entra
          </span>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {confirm === "account"
              ? "Delete your entire passport?"
              : "Delete this memory?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm === "account"
              ? "Your profile, experiences and photos will be permanently removed from Beer Passport. Your Microsoft Entra identity is separate."
              : "This experience and its attached photo will be permanently deleted."}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster position="top-center" richColors />
    </SidebarProvider>
  );
}
