export const Logo: React.FC<{size: number}> = ({size}) => (
    <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="ReQuizle" width={size} height={size} className="rounded-xl" />
);
