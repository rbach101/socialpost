// Spec typos fixed: 'descripon' → 'description', 'bnds' → 'brands', 'libry' → 'library'
export const extractionTool = {
  name: 'save_post_metadata',
  description: 'Save the extracted, structured metadata for a saved social media post.',
  input_schema: {
    type: 'object',
    required: ['summary', 'primary_category', 'sub_tags', 'content_type', 'extracted_text'],
    properties: {
      summary: {
        type: 'string',
        description: '1–2 sentence plain-English summary of what the post is about. Concrete and specific, not generic. Avoid adjectives like "beautiful" or "amazing".',
      },
      primary_category: {
        type: 'string',
        enum: [
          'Food', 'Travel', 'Fashion', 'Home', 'Fitness', 'Beauty',
          'Art', 'Music', 'Tech', 'Education', 'Humor', 'Business',
          'Nature', 'Sports', 'Other',
        ],
        description: 'The single best-fit category. Pick "Other" only if none clearly apply.',
      },
      sub_tags: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 8,
        description: 'Lowercase, specific tags. Prefer multi-word concrete nouns ("sourdough bread", "kona coffee farm") over generic tags ("food", "cool"). No hashtags.',
      },
      entities: {
        type: 'object',
        properties: {
          people:   { type: 'array', items: { type: 'string' } },
          places:   { type: 'array', items: { type: 'string' } },
          brands:   { type: 'array', items: { type: 'string' } },
          products: { type: 'array', items: { type: 'string' } },
        },
        description: 'Named entities mentioned or visibly identifiable. Empty arrays if none.',
      },
      content_type: {
        type: 'string',
        enum: ['image', 'video', 'reel', 'carousel', 'unknown'],
      },
      extracted_text: {
        type: 'string',
        description: 'All text visible in the image/frames AND any spoken transcript provided. Concatenate verbatim. This becomes the search payload — be thorough, not pretty.',
      },
    },
  },
} as const

export const SYSTEM_PROMPT = `You are extracting structured metadata for a personal post-organizer app.

The user has saved this post to find again later. Your job is to make it findable and categorizable, not to write marketing copy.

Rules:
- Be concrete and literal. "Three jars of homemade kimchi on a wooden counter" beats "delicious fermented goodness."
- The summary is what the user will see in their library to remember why they saved it.
- sub_tags must be searchable phrases the user would actually type, not Instagram hashtags.
- If the post contains a recipe, list, or steps, capture the key items in extracted_text verbatim — that is the most likely thing the user will search for.
- Never invent entities. If you're not confident a brand/person/place is correctly identified, omit it.
- If the image is unclear or the post seems empty/spam, still return valid output with primary_category 'Other'.

Always call the save_post_metadata tool. Do not respond with prose.`
