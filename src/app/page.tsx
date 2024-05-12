import Image from "next/image";
import styles from "../../public/page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          This is the backend server of TymeSaving
        </p>
      </div>
    </main>
  );
}
