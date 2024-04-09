import React, { useEffect, useState } from 'react';
import './AvatarSelector.css';
import axios from 'axios';
// import dotenv from 'dotenv';
// dotenv.config();

interface AvatarSelectorProps {
    selectedAvatar: string;
    onSelectAvatar: (avatarId: string) => void;
}


const AvatarSelector: React.FC<AvatarSelectorProps> = ({ selectedAvatar, onSelectAvatar }) => {
    const [agents, setAgents] = useState<string[]>([]);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const response = await axios.get('/api/agents');
            setAgents(response.data.agents);
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
    };

    return (
        <div className="avatar-selector">
            {agents.map((agent) => (
                <div
                    key={agent}
                    className={`avatar-item ${selectedAvatar === agent ? 'selected' : ''}`}
                    onClick={() => onSelectAvatar(agent)}
                >
                    <img src={`avatars/${agent}.png`} alt={agent} />
                    <span>{agent}</span>
                </div>
            ))}
        </div>
    );

};

export default AvatarSelector;