"use client";

import { useEffect, useState } from "react";
import { UserMenu } from "@/components/UserMenu";
import { DashboardLayout } from "@/components/DashboardLayout";
import { HeroCard } from "@/components/HeroCard";
import { ProgressCard } from "@/components/ProgressCard";
import { ActionGrid } from "@/components/ActionGrid";

export default function IeltsPage() {
    const [userName, setUserName] = useState("Kais");
    const [nickname, setNickname] = useState("Kais");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedName = window.localStorage.getItem("speakmate_userName");
            const storedNick = window.localStorage.getItem("speakmate_nickname");
            if (storedName) setUserName(storedName);
            if (storedNick) setNickname(storedNick);
        }
    }, []);

    return (
        <DashboardLayout
            showLogo={true}
            headerRight={
                <UserMenu
                    userName={userName}
                    nickname={nickname}
                    goalLabel="IELTS Prep"
                />
            }
        >
            <div className="flex flex-col h-full justify-between gap-1 pb-2">
                <HeroCard onStart={() => window.location.href = "/hangout?goal=ieltsprep"} />
                <ProgressCard score={7.5} trend="7.1" label="IELTS Band Score" />
                <ActionGrid goal="ieltsprep" />
            </div>
        </DashboardLayout>
    );
}
