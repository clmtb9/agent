/**
 * Notifications locales de la PWA (Web Notifications API).
 * Pour du vrai push serveur, il faudrait VAPID + web-push côté Supabase :
 * ici on couvre les rappels locaux tant que l'app est ouverte / installée.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export function notify(title: string, body?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.svg', badge: '/icon.svg' })
  }
}

/**
 * Programme le rappel du bilan du soir (21h45 — routine Mandala B6/B7).
 * Tant que l'app reste ouverte, le rappel part chaque soir.
 */
export function scheduleEveningReminder() {
  const now = new Date()
  const target = new Date(now)
  target.setHours(21, 45, 0, 0)
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
  const delay = target.getTime() - now.getTime()

  window.setTimeout(() => {
    notify(
      'Bilan du soir 🌙',
      'Téléphone posé. Décharge du soir, temps calme, journal : termine ta journée comme un chef de chantier.',
    )
    scheduleEveningReminder() // reprogramme pour le lendemain
  }, delay)
}
