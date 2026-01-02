import { defineQuery } from 'next-sanity'
import { client } from './client'

// ============================================================================
// KATEGORIEN
// ============================================================================

const HELP_CATEGORIES_QUERY = defineQuery(/* groq */ `*[
  _type == "helpCategory"
]|order(order asc){
  _id,
  "title": select($locale == "en" && defined(titleEn) => titleEn, title),
  "description": select($locale == "en" && defined(descriptionEn) => descriptionEn, description),
  "slug": slug.current,
  icon,
  appSection,
  "articleCount": count(*[_type == "helpArticle" && references(^._id)])
}`)

export async function getHelpCategories(locale: string = 'de') {
  return await client.fetch(HELP_CATEGORIES_QUERY, { locale })
}

// ============================================================================
// ARTIKEL
// ============================================================================

const HELP_ARTICLES_BY_CATEGORY_QUERY = defineQuery(/* groq */ `*[
  _type == "helpArticle"
  && category._ref == $categoryId
]|order(onboardingStep asc, title asc){
  _id,
  "title": select($locale == "en" && defined(titleEn) => titleEn, title),
  "slug": slug.current,
  "excerpt": select($locale == "en" && defined(excerptEn) => excerptEn, excerpt),
  onboardingStep,
  "category": category->{
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "slug": slug.current
  }
}`)

export async function getHelpArticlesByCategory(
  categoryId: string,
  locale: string = 'de',
) {
  return await client.fetch(HELP_ARTICLES_BY_CATEGORY_QUERY, {
    categoryId,
    locale,
  })
}

const HELP_ARTICLE_QUERY = defineQuery(/* groq */ `*[
  _type == "helpArticle"
  && slug.current == $slug
][0]{
  _id,
  "title": select($locale == "en" && defined(titleEn) => titleEn, title),
  "slug": slug.current,
  "excerpt": select($locale == "en" && defined(excerptEn) => excerptEn, excerpt),
  "content": select($locale == "en" && defined(contentEn) => contentEn, content),
  onboardingStep,
  keywords,
  publishedAt,
  updatedAt,
  "tips": tips[]{
    "text": select($locale == "en" && defined(tipEn) => tipEn, tip)
  },
  "videos": videos[]{
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    url,
    duration
  },
  "relatedArticles": relatedArticles[]->{
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "slug": slug.current,
    "excerpt": select($locale == "en" && defined(excerptEn) => excerptEn, excerpt),
    "category": category->{
      "slug": slug.current
    }
  },
  "category": category->{
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "slug": slug.current,
    icon
  }
}`)

export async function getHelpArticle(slug: string, locale: string = 'de') {
  return await client.fetch(HELP_ARTICLE_QUERY, { slug, locale })
}

// ============================================================================
// ONBOARDING
// ============================================================================

const ONBOARDING_ARTICLES_QUERY = defineQuery(/* groq */ `*[
  _type == "helpArticle"
  && category->appSection == "onboarding"
]|order(onboardingStep asc){
  _id,
  "title": select($locale == "en" && defined(titleEn) => titleEn, title),
  "slug": slug.current,
  "excerpt": select($locale == "en" && defined(excerptEn) => excerptEn, excerpt),
  onboardingStep,
  "category": category->{
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "slug": slug.current
  }
}`)

export async function getOnboardingArticles(locale: string = 'de') {
  return await client.fetch(ONBOARDING_ARTICLES_QUERY, { locale })
}

// ============================================================================
// SEITEN-ZUORDNUNG (für Hilfe-Panel)
// ============================================================================

const HELP_FOR_ROUTE_QUERY = defineQuery(/* groq */ `*[
  _type == "helpPageMapping"
  && $route in routes
][0]{
  pageName,
  "mainArticle": mainArticle->{
    _id,
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "slug": slug.current,
    "excerpt": select($locale == "en" && defined(excerptEn) => excerptEn, excerpt),
    "tips": tips[]{
      "text": select($locale == "en" && defined(tipEn) => tipEn, tip)
    },
    "category": category->{
      "title": select($locale == "en" && defined(titleEn) => titleEn, title),
      "slug": slug.current
    }
  },
  "quickTips": quickTips[]{
    "text": select($locale == "en" && defined(tipEn) => tipEn, tip)
  },
  "featureVideo": featureVideo{
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    url,
    thumbnailUrl
  },
  "additionalArticles": additionalArticles[]->{
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "slug": slug.current,
    "excerpt": select($locale == "en" && defined(excerptEn) => excerptEn, excerpt),
    "category": category->{
      "slug": slug.current
    }
  }
}`)

export async function getHelpForRoute(route: string, locale: string = 'de') {
  // Zuerst exakte Route versuchen
  let result = await client.fetch(HELP_FOR_ROUTE_QUERY, { route, locale })

  // Falls nicht gefunden, Wildcard-Suche
  if (!result) {
    // Versuche Parent-Route (z.B. /dashboard/projects/abc → /dashboard/projects/*)
    const wildcardRoute = route.replace(/\/[^/]+$/, '/*')
    result = await client.fetch(HELP_FOR_ROUTE_QUERY, {
      route: wildcardRoute,
      locale,
    })
  }

  return result
}

// ============================================================================
// SUCHE
// ============================================================================

const SEARCH_HELP_ARTICLES_QUERY = defineQuery(/* groq */ `*[
  _type == "helpArticle"
  && (
    title match $searchQuery + "*" ||
    titleEn match $searchQuery + "*" ||
    excerpt match $searchQuery + "*" ||
    excerptEn match $searchQuery + "*" ||
    $searchQuery in keywords
  )
]{
  _id,
  "title": select($locale == "en" && defined(titleEn) => titleEn, title),
  "slug": slug.current,
  "excerpt": select($locale == "en" && defined(excerptEn) => excerptEn, excerpt),
  "category": category->{
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "slug": slug.current
  }
}`)

export async function searchHelpArticles(
  searchQuery: string,
  locale: string = 'de',
) {
  return await client.fetch(SEARCH_HELP_ARTICLES_QUERY, { searchQuery, locale })
}

// ============================================================================
// ALLE KATEGORIEN MIT ARTIKELN (für Academy)
// ============================================================================

const HELP_CATEGORIES_WITH_ARTICLES_QUERY = defineQuery(/* groq */ `*[
  _type == "helpCategory"
]|order(order asc){
  _id,
  "title": select($locale == "en" && defined(titleEn) => titleEn, title),
  "description": select($locale == "en" && defined(descriptionEn) => descriptionEn, description),
  "slug": slug.current,
  icon,
  appSection,
  "articles": *[_type == "helpArticle" && references(^._id)]|order(onboardingStep asc, title asc){
    "title": select($locale == "en" && defined(titleEn) => titleEn, title),
    "slug": slug.current,
    "excerpt": select($locale == "en" && defined(excerptEn) => excerptEn, excerpt),
    onboardingStep
  }
}`)

export async function getHelpCategoriesWithArticles(locale: string = 'de') {
  return await client.fetch(HELP_CATEGORIES_WITH_ARTICLES_QUERY, { locale })
}
