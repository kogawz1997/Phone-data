"use client";

import { useEffect } from "react";

type DeviceModel = {
  platform: "ANDROID" | "IOS" | "IPADOS";
  brand: string;
  model: string;
  storages: string[];
  colors: string[];
  modes: Array<{ value: string; label: string }>;
};

const controlModes = {
  none: [{ value: "NONE", label: "ไม่มี / ยังไม่ตั้งค่า" }],
  android: [
    { value: "NONE", label: "ยังไม่ตั้งค่า" },
    { value: "ANDROID_ENTERPRISE", label: "Android Enterprise" },
  ],
  apple: [
    { value: "NONE", label: "ยังไม่ตั้งค่า" },
    { value: "APPLE_MDM_ADE", label: "Apple MDM / ADE" },
    { value: "APPLE_MDM_MANUAL", label: "Apple MDM Manual" },
    { value: "ICLOUD_CUSTODY", label: "iCloud ร้าน / Custody workflow" },
  ],
};

const deviceCatalog: DeviceModel[] = [
  { platform: "IOS", brand: "Apple", model: "iPhone 16 Pro Max", storages: ["256GB", "512GB", "1TB"], colors: ["Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium"], modes: controlModes.apple },
  { platform: "IOS", brand: "Apple", model: "iPhone 16 Pro", storages: ["128GB", "256GB", "512GB", "1TB"], colors: ["Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium"], modes: controlModes.apple },
  { platform: "IOS", brand: "Apple", model: "iPhone 16", storages: ["128GB", "256GB", "512GB"], colors: ["Black", "White", "Pink", "Teal", "Ultramarine"], modes: controlModes.apple },
  { platform: "IOS", brand: "Apple", model: "iPhone 15 Pro Max", storages: ["256GB", "512GB", "1TB"], colors: ["Black Titanium", "White Titanium", "Blue Titanium", "Natural Titanium"], modes: controlModes.apple },
  { platform: "IOS", brand: "Apple", model: "iPhone 15", storages: ["128GB", "256GB", "512GB"], colors: ["Black", "Blue", "Green", "Yellow", "Pink"], modes: controlModes.apple },
  { platform: "IOS", brand: "Apple", model: "iPhone 14 Pro Max", storages: ["128GB", "256GB", "512GB", "1TB"], colors: ["Space Black", "Silver", "Gold", "Deep Purple"], modes: controlModes.apple },
  { platform: "IOS", brand: "Apple", model: "iPhone 14", storages: ["128GB", "256GB", "512GB"], colors: ["Midnight", "Starlight", "Blue", "Purple", "Red", "Yellow"], modes: controlModes.apple },
  { platform: "IOS", brand: "Apple", model: "iPhone 13 Pro Max", storages: ["128GB", "256GB", "512GB", "1TB"], colors: ["Graphite", "Gold", "Silver", "Sierra Blue", "Alpine Green"], modes: controlModes.apple },
  { platform: "IOS", brand: "Apple", model: "iPhone 13", storages: ["128GB", "256GB", "512GB"], colors: ["Midnight", "Starlight", "Blue", "Pink", "Red", "Green"], modes: controlModes.apple },
  { platform: "IPADOS", brand: "Apple", model: "iPad Pro 12.9", storages: ["128GB", "256GB", "512GB", "1TB", "2TB"], colors: ["Space Gray", "Silver"], modes: controlModes.apple },
  { platform: "IPADOS", brand: "Apple", model: "iPad Air", storages: ["64GB", "128GB", "256GB", "512GB"], colors: ["Space Gray", "Blue", "Purple", "Starlight"], modes: controlModes.apple },
  { platform: "ANDROID", brand: "Samsung", model: "Galaxy S25 Ultra", storages: ["256GB", "512GB", "1TB"], colors: ["Titanium Black", "Titanium Silverblue", "Titanium Gray", "Titanium Whitesilver"], modes: controlModes.android },
  { platform: "ANDROID", brand: "Samsung", model: "Galaxy S24 Ultra", storages: ["256GB", "512GB", "1TB"], colors: ["Titanium Gray", "Titanium Black", "Titanium Violet", "Titanium Yellow"], modes: controlModes.android },
  { platform: "ANDROID", brand: "Samsung", model: "Galaxy S24 FE", storages: ["128GB", "256GB"], colors: ["Blue", "Graphite", "Gray", "Mint", "Yellow"], modes: controlModes.android },
  { platform: "ANDROID", brand: "Samsung", model: "Galaxy A55 5G", storages: ["128GB", "256GB"], colors: ["Awesome Navy", "Awesome Iceblue", "Awesome Lilac", "Awesome Lemon"], modes: controlModes.android },
  { platform: "ANDROID", brand: "Samsung", model: "Galaxy A35 5G", storages: ["128GB", "256GB"], colors: ["Awesome Navy", "Awesome Iceblue", "Awesome Lilac", "Awesome Lemon"], modes: controlModes.android },
  { platform: "ANDROID", brand: "OPPO", model: "Reno12 5G", storages: ["256GB", "512GB"], colors: ["Matte Brown", "Astro Silver", "Sunset Pink"], modes: controlModes.android },
  { platform: "ANDROID", brand: "OPPO", model: "A3 Pro 5G", storages: ["128GB", "256GB"], colors: ["Moonlight Purple", "Starry Black"], modes: controlModes.android },
  { platform: "ANDROID", brand: "vivo", model: "V40 5G", storages: ["256GB", "512GB"], colors: ["Nebula Purple", "Stellar Silver", "Sunglow Peach"], modes: controlModes.android },
  { platform: "ANDROID", brand: "vivo", model: "Y28", storages: ["128GB", "256GB"], colors: ["Gleaming Orange", "Agate Green"], modes: controlModes.android },
  { platform: "ANDROID", brand: "Xiaomi", model: "Redmi Note 13 Pro 5G", storages: ["256GB", "512GB"], colors: ["Midnight Black", "Ocean Teal", "Aurora Purple"], modes: controlModes.android },
  { platform: "ANDROID", brand: "Xiaomi", model: "POCO X6 Pro", storages: ["256GB", "512GB"], colors: ["Black", "Yellow", "Gray"], modes: controlModes.android },
];

function unique(values: string[]) {
  return [...new Set(values)].filter(Boolean);
}

function makeSelect(name: string, current: HTMLInputElement | HTMLSelectElement, options: string[]) {
  const select = document.createElement("select");
  select.name = name;
  select.className = current.className || "input";
  select.required = current.hasAttribute("required");
  select.dataset.deviceEnhanced = "true";
  for (const item of options) {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  }
  current.replaceWith(select);
  return select;
}

function fill(select: HTMLSelectElement, options: string[], selected?: string) {
  select.innerHTML = "";
  for (const item of options) {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  }
  if (selected && options.includes(selected)) select.value = selected;
  else if (options[0]) select.value = options[0];
}

function enhanceDeviceForm() {
  const form = document.querySelector<HTMLFormElement>('form input[name="imei"]')?.closest("form");
  if (!form || form.dataset.deviceCascadeReady === "true") return;

  const platformInput = form.querySelector<HTMLSelectElement>('select[name="platform"]');
  const brandInput = form.querySelector<HTMLInputElement | HTMLSelectElement>('[name="brand"]');
  const modelInput = form.querySelector<HTMLInputElement | HTMLSelectElement>('[name="model"]');
  const storageInput = form.querySelector<HTMLInputElement | HTMLSelectElement>('[name="storage"]');
  const colorInput = form.querySelector<HTMLInputElement | HTMLSelectElement>('[name="color"]');
  const modeInput = form.querySelector<HTMLSelectElement>('select[name="controlMode"]');

  if (!platformInput || !brandInput || !modelInput || !storageInput || !colorInput || !modeInput) return;

  form.dataset.deviceCascadeReady = "true";
  const platformSelect = platformInput;
  const brandSelect = brandInput instanceof HTMLSelectElement ? brandInput : makeSelect("brand", brandInput, []);
  const modelSelect = modelInput instanceof HTMLSelectElement ? modelInput : makeSelect("model", modelInput, []);
  const storageSelect = storageInput instanceof HTMLSelectElement ? storageInput : makeSelect("storage", storageInput, []);
  const colorSelect = colorInput instanceof HTMLSelectElement ? colorInput : makeSelect("color", colorInput, []);

  const badge = document.createElement("div");
  badge.className = "notice";
  badge.innerHTML = "<b>เลือกเครื่องแบบมืออาชีพ</b><br><span class='small'>เลือกระบบก่อน แล้วระบบจะกรองยี่ห้อ รุ่น ความจุ สี และโหมดควบคุมให้เอง ไม่ต้องพิมพ์มั่วเหมือนทำบัญชีในสมุดฉีก</span>";
  form.querySelector("h2")?.parentElement?.appendChild(badge);

  function syncFromPlatform() {
    const platform = platformSelect.value as DeviceModel["platform"];
    const rows = deviceCatalog.filter((item) => item.platform === platform);
    const brands = unique(rows.map((item) => item.brand));
    fill(brandSelect, brands, brandSelect.value);
    syncFromBrand();
  }

  function syncFromBrand() {
    const platform = platformSelect.value as DeviceModel["platform"];
    const rows = deviceCatalog.filter((item) => item.platform === platform && item.brand === brandSelect.value);
    fill(modelSelect, unique(rows.map((item) => item.model)), modelSelect.value);
    syncFromModel();
  }

  function syncFromModel() {
    const row = deviceCatalog.find((item) => item.platform === platformSelect.value && item.brand === brandSelect.value && item.model === modelSelect.value);
    fill(storageSelect, row?.storages ?? ["64GB", "128GB", "256GB", "512GB", "1TB"], storageSelect.value);
    fill(colorSelect, row?.colors ?? ["Black", "White", "Blue", "Gold", "Silver"], colorSelect.value);
    modeInput.innerHTML = "";
    for (const mode of row?.modes ?? controlModes.none) {
      const option = document.createElement("option");
      option.value = mode.value;
      option.textContent = mode.label;
      modeInput.appendChild(option);
    }
  }

  platformSelect.addEventListener("change", syncFromPlatform);
  brandSelect.addEventListener("change", syncFromBrand);
  modelSelect.addEventListener("change", syncFromModel);
  syncFromPlatform();
}

export default function DeviceStockEnhancer() {
  useEffect(() => {
    enhanceDeviceForm();
    const timer = window.setInterval(enhanceDeviceForm, 600);
    const observer = new MutationObserver(enhanceDeviceForm);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, []);

  return null;
}
