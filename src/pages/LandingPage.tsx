/**
 * StockFacture Pro - Landing Page
 * 
 * Page marketing affichée aux visiteurs non connectés.
 * Présente les bénéfices, captures d'écran, FAQ, et appelle à l'action.
 */

import React, { useState } from 'react';
import {
  Zap,
  WifiOff,
  BarChart3,
  Printer,
  Coins,
  Cloud,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Smartphone,
  Shield,
  Sparkles,
} from 'lucide-react';
import { signInWithGoogle, signInWithGoogleElectron } from '../services/firebase';
import { BrandLogo } from '../components/common/BrandLogo';

interface LandingPageProps {
  onSignInSuccess?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignInSuccess }) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      // ✅ Détecte si on est dans Electron
      if ((window as any).electronAPI?.isElectron) {
        await signInWithGoogleElectron();
      } else {
        await signInWithGoogle();
      }
      onSignInSuccess?.();
    } catch (e: any) {
      console.error('Sign-in error:', e);
      setError(e?.message || 'Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  const faqs = [
    {
      q: 'Est-ce que je peux utiliser l\'app sans internet ?',
      a: 'Oui ! StockFacture Pro fonctionne 100 % hors-ligne. Vous pouvez vendre, encaisser et gérer votre stock même sans connexion. Dès que vous retrouvez internet, tout se synchronise automatiquement.',
    },
    {
      q: 'Mes données sont-elles en sécurité ?',
      a: 'Absolument. Vos données sont chiffrées et sauvegardées automatiquement dans le cloud. Chaque utilisateur a son propre espace sécurisé — personne d\'autre ne peut y accéder.',
    },
    {
      q: 'Puis-je utiliser l\'app sur plusieurs appareils ?',
      a: 'Oui. Vous pouvez utiliser StockFacture Pro sur votre téléphone, tablette et ordinateur. Toutes vos données se synchronisent en temps réel.',
    },
    {
      q: 'Est-ce que je peux imprimer mes factures ?',
      a: 'Oui. Vous pouvez imprimer des factures A4, des reçus A5, ou des tickets thermiques 58 mm / 80 mm compatibles avec les imprimantes POS courantes.',
    },
    {
      q: 'Comment démarrer ?',
      a: 'C\'est simple : cliquez sur "Commencer gratuitement", connectez-vous avec Google, et commencez à utiliser l\'app en 30 secondes. Aucune carte bancaire requise.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#14213D] antialiased">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8EDF2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              {/* ✅ Conteneur avec taille fixe pour que le SVG s'affiche bien sur Android */}
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <BrandLogo size="md" />
              </div>
              <div className="text-left">
                <span className="block font-extrabold text-[#14213D] text-base sm:text-lg leading-tight">
                  StockFacture Pro
                </span>
                <span className="hidden sm:block text-[10px] text-[#64748B] font-medium leading-tight">
                  Votre gestion, partout, tout le temps.
                </span>
              </div>
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollTo('features')}
                className="text-sm font-semibold text-[#64748B] hover:text-[#14213D] transition-colors"
              >
                Fonctionnalités
              </button>
              <button
                onClick={() => scrollTo('how-it-works')}
                className="text-sm font-semibold text-[#64748B] hover:text-[#14213D] transition-colors"
              >
                Comment ça marche
              </button>
              <button
                onClick={() => scrollTo('faq')}
                className="text-sm font-semibold text-[#64748B] hover:text-[#14213D] transition-colors"
              >
                FAQ
              </button>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isSigningIn ? 'Connexion…' : 'Se connecter'}
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F1F5F9] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-[#E8EDF2] space-y-3">
              <button
                onClick={() => scrollTo('features')}
                className="block w-full text-left py-2 text-sm font-semibold text-[#14213D]"
              >
                Fonctionnalités
              </button>
              <button
                onClick={() => scrollTo('how-it-works')}
                className="block w-full text-left py-2 text-sm font-semibold text-[#14213D]"
              >
                Comment ça marche
              </button>
              <button
                onClick={() => scrollTo('faq')}
                className="block w-full text-left py-2 text-sm font-semibold text-[#14213D]"
              >
                FAQ
              </button>
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm"
              >
                {isSigningIn ? 'Connexion…' : 'Se connecter'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ============================================ */}
      {/* HERO */}
      {/* ============================================ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF7ED] via-[#FAFAF8] to-[#FAFAF8] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nouveau — Fonctionne 100 % hors-ligne</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-[#14213D] leading-[1.1] tracking-tight">
                Gérez votre commerce depuis votre téléphone.
              </h1>

              <p className="text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Facturez, suivez votre stock, encaissez —{' '}
                <strong className="text-[#14213D]">même sans internet</strong>.
              </p>

              <p className="text-base sm:text-lg font-bold text-orange-600">
                Votre gestion, partout, tout le temps.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  <span>{isSigningIn ? 'Connexion en cours…' : 'Commencer gratuitement'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#F8FAFC] border border-[#E8EDF2] text-[#14213D] font-bold text-sm sm:text-base transition-all active:scale-95 cursor-pointer"
                >
                  Voir comment ça marche
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 pt-2 text-xs sm:text-sm text-[#64748B]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Sans engagement
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Aucune carte bancaire
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Données sécurisées
                </span>
              </div>

              {error && (
                <div className="inline-block px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}
            </div>

            {/* Right: mobile mockup */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[280px] sm:max-w-[320px]">
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-400 to-orange-200 rounded-[2.5rem] blur-3xl opacity-30 scale-90" />
                <div className="relative rounded-[2.5rem] border-[10px] border-[#14213D] bg-[#14213D] shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#14213D] rounded-b-2xl z-10" />
                  <img
                    src="./landing/mobile-accueil.png"
                    alt="Tableau de bord StockFacture Pro"
                    className="w-full h-auto block"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* BÉNÉFICES */}
      {/* ============================================ */}
      <section id="features" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#14213D] mb-3">
              Tout ce qu'il faut pour gérer votre commerce
            </h2>
            <p className="text-base text-[#64748B]">
              Des fonctionnalités pensées pour la réalité du terrain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                icon: Zap,
                color: 'orange',
                title: 'Facturez en 30 secondes',
                desc: 'Interface pensée pour aller vite. Un client, des articles, un paiement — terminé.',
              },
              {
                icon: WifiOff,
                color: 'emerald',
                title: 'Fonctionne hors-ligne',
                desc: 'Pas besoin d\'internet pour vendre. Vos données se synchronisent dès que la connexion revient.',
              },
              {
                icon: BarChart3,
                color: 'blue',
                title: 'Suivez votre stock en temps réel',
                desc: 'Alertes automatiques quand un produit est en rupture. Fini les mauvaises surprises.',
              },
              {
                icon: Printer,
                color: 'violet',
                title: 'Reçus thermiques',
                desc: 'Imprimez vos tickets sur n\'importe quelle imprimante POS (58 mm ou 80 mm).',
              },
              {
                icon: Coins,
                color: 'amber',
                title: 'Multi-devises',
                desc: 'FCFA, EUR, USD, GHS, NGN… Choisissez votre devise, l\'app s\'adapte.',
              },
              {
                icon: Cloud,
                color: 'sky',
                title: 'Sauvegarde automatique',
                desc: 'Vos données sont sauvegardées dans le cloud. Perdez votre téléphone, retrouvez tout.',
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8EDF2] hover:border-orange-200 hover:shadow-md transition-all duration-200"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                      feature.color === 'orange'
                        ? 'bg-orange-100 text-orange-600'
                        : feature.color === 'emerald'
                        ? 'bg-emerald-100 text-emerald-600'
                        : feature.color === 'blue'
                        ? 'bg-blue-100 text-blue-600'
                        : feature.color === 'violet'
                        ? 'bg-violet-100 text-violet-600'
                        : feature.color === 'amber'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-sky-100 text-sky-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-[#14213D] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* COMMENT ÇA MARCHE */}
      {/* ============================================ */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#14213D] mb-3">
              Simple comme bonjour.
            </h2>
            <p className="text-base text-[#64748B]">
              Trois étapes pour commencer à gérer votre commerce.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: '1',
                title: 'Créez votre compte',
                desc: 'Connectez-vous en 30 secondes avec votre compte Google.',
              },
              {
                step: '2',
                title: 'Ajoutez vos produits',
                desc: 'Saisissez vos articles, ou importez-les. Prix, stock, catégories.',
              },
              {
                step: '3',
                title: 'Vendez !',
                desc: 'Créez une facture, encaissez, imprimez le reçu. C\'est tout.',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E8EDF2] h-full">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-500/20 mb-5">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-extrabold text-[#14213D] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <span>{isSigningIn ? 'Connexion…' : 'Commencer maintenant'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CAPTURES D'ÉCRAN */}
      {/* ============================================ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#14213D] mb-3">
              Une interface claire, pensée pour vous.
            </h2>
            <p className="text-base text-[#64748B]">
              Pas de menus compliqués. Pas de jargon. Juste ce dont vous avez besoin.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Desktop screenshot */}
            <div className="order-2 lg:order-1">
              <div className="rounded-2xl border border-[#E8EDF2] bg-[#FAFAF8] p-3 sm:p-4 shadow-xl">
                <img
                  src="./landing/desktop-produits.png"
                  alt="Gestion des produits StockFacture Pro"
                  className="w-full h-auto rounded-xl block"
                  loading="lazy"
                />
              </div>
              <p className="text-center text-sm font-semibold text-[#64748B] mt-4">
                Gérez votre catalogue et vos marges
              </p>
            </div>

            {/* Mobile screenshot */}
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="w-full max-w-[240px]">
                <div className="rounded-[2rem] border-[8px] border-[#14213D] bg-[#14213D] shadow-2xl overflow-hidden">
                  <img
                    src="./landing/mobile-ventes.png"
                    alt="Ventes et factures StockFacture Pro"
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>
                <p className="text-center text-sm font-semibold text-[#64748B] mt-4">
                  Facturez et suivez vos règlements
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* POURQUOI NOUS CHOISIR */}
      {/* ============================================ */}
      <section className="py-16 sm:py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#14213D] mb-3">
              Conçu pour l'Afrique de l'Ouest.
            </h2>
            <p className="text-base text-[#64748B]">
              Une application qui comprend votre réalité.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Coins,
                title: 'Pensé localement',
                desc: 'Multi-devises (FCFA, GHS, NGN), format des factures adapté, interface en français.',
              },
              {
                icon: WifiOff,
                title: 'Fonctionne sans internet',
                desc: 'Vos connexions sont instables ? Pas de problème. L\'app fonctionne hors-ligne et se synchronise automatiquement.',
              },
              {
                icon: Printer,
                title: 'Compatible imprimantes locales',
                desc: 'Tickets thermiques 58 mm et 80 mm. Compatible avec les imprimantes POS courantes.',
              },
              {
                icon: Shield,
                title: 'Sécurisé et sauvegardé',
                desc: 'Vos données sont chiffrées et sauvegardées dans le cloud. Vous seul y avez accès.',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="flex gap-4 p-5 rounded-2xl bg-white border border-[#E8EDF2]"
                >
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#14213D] mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FAQ */}
      {/* ============================================ */}
      <section id="faq" className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#14213D] mb-3">
              Questions fréquentes.
            </h2>
            <p className="text-base text-[#64748B]">
              Tout ce que vous voulez savoir avant de commencer.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#E8EDF2] bg-[#FAFAF8] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white transition-colors"
                >
                  <span className="font-bold text-sm sm:text-base text-[#14213D]">
                    {faq.q}
                  </span>
                  <span className="shrink-0 w-7 h-7 rounded-full bg-white border border-[#E8EDF2] flex items-center justify-center">
                    <span className="text-[#64748B] font-bold text-lg leading-none">
                      {openFaq === i ? '−' : '+'}
                    </span>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-[#64748B] leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CTA FINAL */}
      {/* ============================================ */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[#14213D] to-[#1E3A5F] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-4">
            Prêt à simplifier votre gestion ?
          </h2>
          <p className="text-base sm:text-lg text-[#CBD5E1] mb-8 max-w-2xl mx-auto">
            Rejoignez les commerçants qui ont déjà adopté StockFacture Pro.
          </p>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-base shadow-lg shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <span>{isSigningIn ? 'Connexion…' : 'Commencer gratuitement'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="text-xs text-[#94A3B8] mt-4">
            Sans engagement · Sans carte bancaire
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="bg-[#0F172A] text-[#94A3B8] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                {/* ✅ Conteneur avec taille fixe pour le footer aussi */}
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <BrandLogo size="md" />
                </div>
                <span className="font-extrabold text-white">StockFacture Pro</span>
              </div>
              <p className="text-xs leading-relaxed mb-2">
                Votre gestion, partout, tout le temps.
              </p>
              <p className="text-[11px] leading-relaxed text-[#64748B]">
                La gestion commerciale simple pour les commerçants d'Afrique de l'Ouest.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Produit</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">
                    Fonctionnalités
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('how-it-works')} className="hover:text-white transition-colors">
                    Comment ça marche
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('faq')} className="hover:text-white transition-colors">
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Ressources</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="https://github.com/instantafrik-rgb/stockfacture-pro" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://github.com/instantafrik-rgb/stockfacture-pro/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Légal</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="/LICENSE" className="hover:text-white transition-colors">
                    Licence
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#1E293B] text-center">
            <p className="text-xs">
              © 2026 StockFacture Pro — Tous droits réservés. Conçu avec amour pour les commerces.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};