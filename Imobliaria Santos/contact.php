<?php
header('Content-Type: text/plain; charset=utf-8');

if (!empty($_POST['website'])) { // honeypot
  http_response_code(400);
  echo "Spam bloqueado.";
  exit;
}

$nome = trim($_POST['nome'] ?? '');
$tel  = trim($_POST['telefone'] ?? '');
$msg  = trim($_POST['mensagem'] ?? '');

if ($nome === '' || $tel === '' || $msg === '') {
  http_response_code(422);
  echo "Campos obrigatórios faltando.";
  exit;
}

// Aqui você enviaria e-mail ou salvaria no banco.
// Para dev, só retorna sucesso:
echo "Mensagem recebida! Em breve entraremos em contato.";
