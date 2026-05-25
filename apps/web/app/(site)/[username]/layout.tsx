import type { ReactNode } from 'react';



export default function ProfileLayout({

  children,

  modal,

}: {

  children: ReactNode;

  modal: ReactNode;

}) {

  return (

    <>

      {children}

      {modal}

    </>

  );

}

