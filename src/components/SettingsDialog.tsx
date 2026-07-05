import { useSettings } from '@/context/SettingsContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Settings } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function SettingsDialog() {
  const { 
    notificationsEnabled, 
    setNotificationsEnabled, 
    developerMode, 
    setDeveloperMode 
  } = useSettings();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-cream hover:text-warm-gold">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-deep-brown border-warm-gold/20 text-cream">
        <DialogHeader>
          <DialogTitle className="text-cream font-display">App Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">Enable Notifications</Label>
            <Toggle 
              id="notifications" 
              pressed={notificationsEnabled} 
              onPressedChange={setNotificationsEnabled}
              className="data-[state=on]:bg-warm-gold data-[state=on]:text-charcoal"
            >
              {notificationsEnabled ? 'On' : 'Off'}
            </Toggle>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="devMode">Developer Mode</Label>
            <Toggle 
              id="devMode" 
              pressed={developerMode} 
              onPressedChange={setDeveloperMode}
              className="data-[state=on]:bg-warm-gold data-[state=on]:text-charcoal"
            >
              {developerMode ? 'On' : 'Off'}
            </Toggle>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
