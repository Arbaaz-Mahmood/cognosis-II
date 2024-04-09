import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Button } from '@mui/material';

interface PreferencesPopupProps {
  open: boolean;
  onClose: (selectedTheme: string, selectedLanguage: string) => void;
}

const PreferencesPopup: React.FC<PreferencesPopupProps> = ({ open, onClose }) => {
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTheme(event.target.value);
  };

  const handleLanguageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedLanguage(event.target.value);
  };

  const handleSubmit = () => {
    localStorage.setItem('userPreferences', JSON.stringify({ theme: selectedTheme, language: selectedLanguage }));
    onClose(selectedTheme, selectedLanguage);
  };

  return (
    <Dialog open={open} onClose={() => onClose('', '')}>
      <DialogTitle>Select Your Preferences</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset" style={{ marginBottom: '16px' }}>
          <FormLabel component="legend">Theme</FormLabel>
          <RadioGroup value={selectedTheme} onChange={handleThemeChange}>
            <FormControlLabel value="light" control={<Radio />} label="Light" />
            <FormControlLabel value="dark" control={<Radio />} label="Dark" />
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset">
          <FormLabel component="legend">Language</FormLabel>
          <RadioGroup value={selectedLanguage} onChange={handleLanguageChange}>
            <FormControlLabel value="english" control={<Radio />} label="English" />
            <FormControlLabel value="spanish" control={<Radio />} label="Spanish" />
            <FormControlLabel value="french" control={<Radio />} label="French" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} disabled={!selectedTheme || !selectedLanguage}>
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreferencesPopup;