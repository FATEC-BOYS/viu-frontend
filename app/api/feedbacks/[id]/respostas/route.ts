// app/api/feedbacks/[id]/respostas/route.ts
// feedback_respostas não existe no viu-backend — GET retorna vazio, POST retorna 501
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json(
    { error: "Respostas de feedback não disponíveis nesta versão." },
    { status: 501 }
  );
}
