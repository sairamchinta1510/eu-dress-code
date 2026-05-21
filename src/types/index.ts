export interface OutfitDetail {
  photo: string;
  jacket: string;
  top: string;
  bottom: string;
  accessories: string[];
  shoeType: string;
  shoeColour: string;
  dos: string[];
  donts: string[];
}

export interface DressCode {
  id: string;
  name: string;
  icon: string;
  formality: 1 | 2 | 3 | 4 | 5;
  formalityLabel: string;
  occasions: string[];
  description: string;
  keywords: string[];
  men: OutfitDetail;
  women: OutfitDetail;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  bodyPreview?: string;
  detectedDressCodeId?: string;
}

export interface ClosetResult {
  found: string[];
  missing: string[];
  suggestions: string[];
  suitableFor?: Array<{ id: string; name: string }>;
}

export interface OutfitDetails {
  jacket?: string;
  top?: string;
  bottom?: string;
  accessories?: string[];
  shoeType?: string;
  shoeColour?: string;
  dos?: string[];
  donts?: string[];
}

export interface AiRecommendation {
  name: string;
  description: string;
  occasions: string[];
  formality: 1 | 2 | 3 | 4 | 5;
  formalityLabel: string;
  menOutfit: string;
  womenOutfit: string;
  menDetails?: OutfitDetails;
  womenDetails?: OutfitDetails;
  menPhoto?: string;
  womenPhoto?: string;
  menPhotoSearch?: string;
  womenPhotoSearch?: string;
}
