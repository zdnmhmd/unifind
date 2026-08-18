import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { CATEGORIES, LOCATIONS, OTHER_LOCATION, toDateInputValue } from "@/constants";
import { ImageUploader } from "@/components/common/ImageUploader";
import { FieldError } from "@/components/common/Feedback";
import type { ItemPayload } from "@/services/itemService";
import type { Item, ItemType } from "@/types";

type Errors = Partial<Record<keyof ItemPayload, string>>;

/**
 * One reusable form for /report/lost, /report/found, and /items/:id/edit
 * (spec section 21). Only the wording changes with `mode`.
 */
export function ItemForm({
  mode,
  initial,
  submitLabel,
  submitting,
  onSubmit,
}: {
  mode: ItemType;
  initial?: Item;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (payload: ItemPayload) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [identifying, setIdentifying] = useState(initial?.identifying_details ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [date, setDate] = useState(
    initial ? toDateInputValue(initial.date_lost_found) : toDateInputValue(new Date())
  );

  // "Other" reveals a free-text box — UniFind has no map, so location is either
  // a known campus place or whatever the member types (spec section 7).
  const initialIsPreset = initial ? LOCATIONS.includes(initial.location as never) : true;
  const [locationChoice, setLocationChoice] = useState(
    initial ? (initialIsPreset ? initial.location : OTHER_LOCATION) : ""
  );
  const [customLocation, setCustomLocation] = useState(
    initial && !initialIsPreset ? initial.location : ""
  );

  const [errors, setErrors] = useState<Errors>({});

  const dateLabel = mode === "lost" ? "Date lost" : "Date found";
  const resolvedLocation =
    locationChoice === OTHER_LOCATION ? customLocation.trim() : locationChoice;

  function validate(): Errors {
    const next: Errors = {};
    if (title.trim().length < 2) next.title = "Give the item a short, recognisable name.";
    if (!category) next.category = "Choose a category.";
    if (description.trim().length < 10) {
      next.description = "Add at least a sentence describing the item.";
    }
    if (!resolvedLocation) next.location = "Choose where on campus this happened.";
    if (!date) next.date_lost_found = "Select a date.";
    else if (new Date(date) > new Date()) next.date_lost_found = "The date cannot be in the future.";
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validating here is for good UX; the backend validates independently.
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.querySelector(".field-error")?.scrollIntoView({ block: "center" });
      return;
    }

    await onSubmit({
      type: mode,
      title: title.trim(),
      category,
      description: description.trim(),
      location: resolvedLocation,
      date_lost_found: new Date(date).toISOString(),
      image_url: imageUrl,
      brand: brand.trim() || null,
      color: color.trim() || null,
      model: model.trim() || null,
      identifying_details: identifying.trim() || null,
    });
  }

  return (
    <form className="item-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="form-section raised">
        <legend>
          <span className="mono-label accent">01 / THE BASICS</span>
          <h2>What {mode === "lost" ? "did you lose" : "did you find"}?</h2>
        </legend>

        <label className="field">
          <span>
            Item name <em>required</em>
          </span>
          <input
            className="recessed"
            value={title}
            maxLength={180}
            onChange={event => setTitle(event.target.value)}
            placeholder={mode === "lost" ? "e.g. Black iPhone 14" : "e.g. Navy blue backpack"}
          />
          <FieldError message={errors.title} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>
              Category <em>required</em>
            </span>
            <select
              className="recessed"
              value={category}
              onChange={event => setCategory(event.target.value)}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError message={errors.category} />
          </label>

          <label className="field">
            <span>
              {dateLabel} <em>required</em>
            </span>
            <input
              className="recessed"
              type="date"
              value={date}
              max={toDateInputValue(new Date())}
              onChange={event => setDate(event.target.value)}
            />
            <FieldError message={errors.date_lost_found} />
          </label>
        </div>

        <label className="field">
          <span>
            Where on campus? <em>required</em>
          </span>
          <select
            className="recessed"
            value={locationChoice}
            onChange={event => setLocationChoice(event.target.value)}
          >
            <option value="">Select a location</option>
            {LOCATIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {locationChoice === OTHER_LOCATION && (
            <input
              className="recessed mt-8"
              value={customLocation}
              maxLength={180}
              onChange={event => setCustomLocation(event.target.value)}
              placeholder="Describe the place, e.g. Bus bay near Gate 2"
            />
          )}
          <FieldError message={errors.location} />
        </label>

        <label className="field">
          <span>
            Description <em>required</em>
          </span>
          <textarea
            className="recessed"
            rows={4}
            value={description}
            maxLength={5000}
            onChange={event => setDescription(event.target.value)}
            placeholder="Describe it the way someone else would recognise it…"
          />
          <FieldError message={errors.description} />
        </label>
      </fieldset>

      <fieldset className="form-section raised">
        <legend>
          <span className="mono-label accent">02 / DETAILS THAT HELP MATCHING</span>
          <h2>Optional, but they sharpen the signal.</h2>
        </legend>

        <div className="field-row">
          <label className="field">
            <span>Brand</span>
            <input
              className="recessed"
              value={brand}
              maxLength={100}
              onChange={event => setBrand(event.target.value)}
              placeholder="e.g. Samsung"
            />
          </label>
          <label className="field">
            <span>Color</span>
            <input
              className="recessed"
              value={color}
              maxLength={80}
              onChange={event => setColor(event.target.value)}
              placeholder="e.g. Black"
            />
          </label>
        </div>

        <label className="field">
          <span>Model</span>
          <input
            className="recessed"
            value={model}
            maxLength={120}
            onChange={event => setModel(event.target.value)}
            placeholder="e.g. Galaxy S24"
          />
        </label>

        <label className="field">
          <span>
            Additional identifying details <em className="private">private to you</em>
          </span>
          <textarea
            className="recessed"
            rows={3}
            value={identifying}
            maxLength={3000}
            onChange={event => setIdentifying(event.target.value)}
            placeholder="A scratch, a sticker, what's inside… kept off the public listing."
          />
          <p className="field-hint">
            Only you can see this. Keep one or two details back so a real owner can prove the item is
            theirs during a claim.
          </p>
        </label>
      </fieldset>

      <fieldset className="form-section raised">
        <legend>
          <span className="mono-label accent">03 / PHOTO</span>
          <h2>A picture makes it recognisable.</h2>
        </legend>
        <ImageUploader value={imageUrl} onChange={setImageUrl} />
      </fieldset>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel} <ArrowRight size={17} />
      </button>
    </form>
  );
}
