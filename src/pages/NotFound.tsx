import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">{t('notfound_title')}</h1>
        <p className="text-xl text-muted-foreground mb-4">{t('notfound_message')}</p>
        <a href="/" className="text-tiffany hover:text-tiffany/80 underline font-medium">
          {t('notfound_link')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
